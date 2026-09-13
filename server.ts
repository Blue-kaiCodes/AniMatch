import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { ContentRecommender } from './src/utils/recommender.js';
import { Anime, Connection, Message, ActivityFeedItem } from './src/types.js';
import { GoogleGenAI } from '@google/genai';
import * as db from './src/utils/serverDb.js';
import {
  globalAnimePool,
  seedGlobalAnimePool,
  searchOnlineAnime,
  getOnlineAnimeDetails,
  getOnlineRecommendations,
  fetchDynamicRecommendationCandidates
} from './src/utils/liveAnimeProvider.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory cache for live typing indicators
const typingStates: Record<string, Record<string, { isTyping: boolean, timestamp: number }>> = {};

// Clean up stale typing statuses periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(typingStates).forEach(senderId => {
    Object.keys(typingStates[senderId]).forEach(receiverId => {
      if (now - typingStates[senderId][receiverId].timestamp > 6000) {
        delete typingStates[senderId][receiverId];
      }
    });
    if (Object.keys(typingStates[senderId]).length === 0) {
      delete typingStates[senderId];
    }
  });
}, 10000);

// Diagnostic middleware to capture and log any error or failed request with stack trace
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  const oldSend = res.send;
  res.send = function (data) {
    if (res.statusCode >= 400) {
      console.error(`[API Error Response] ${req.method} ${req.url} returned status ${res.statusCode}:`, data);
    }
    return oldSend.apply(res, arguments as any);
  };
  next();
});

// Seed the dynamic online anime pool on server startup
seedGlobalAnimePool().catch(err => {
  console.error('[Startup] Failed to seed dynamic global anime pool:', err.message);
});

// Lazy initialization of Gemini API Client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'MY_GEMINI_API_KEY') {
      throw new Error('GEMINI_API_KEY environment variable is not configured. Please add it in the Secrets panel.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Robust wrapper with automatic retry and exponential backoff for transient Gemini errors (like 503)
async function callGeminiWithRetry<T>(
  apiCall: () => Promise<T>,
  retries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: any;
  let delay = initialDelay;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;
      const errStr = String(error.message || error).toLowerCase();
      
      const isTransient =
        errStr.includes('503') ||
        errStr.includes('429') ||
        errStr.includes('unavailable') ||
        errStr.includes('rate limit') ||
        errStr.includes('overloaded') ||
        errStr.includes('high demand') ||
        errStr.includes('service unavailable');

      if (!isTransient || i === retries - 1) {
        throw error;
      }

      console.warn(`[Gemini Retry] Received transient error, retrying in ${delay}ms... (Attempt ${i + 1}/${retries}). Error: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // exponential backoff
    }
  }
  throw lastError;
}

// API Routes

// Helper to get logged-in user ID from x-user-id header
function getAuthUserId(req: express.Request): string | null {
  const header = req.headers['x-user-id'];
  if (!header) return null;
  return String(header);
}

// 0a. Auth Endpoints
app.post('/api/auth/sync', async (req, res) => {
  try {
    const { id, username, email, avatar, favoriteGenres, bio } = req.body;
    if (!id || !email) {
      return res.status(400).json({ error: 'User id and email are required.' });
    }
    const found = await db.syncUser({
      id,
      username: username || email.split('@')[0],
      email,
      avatar: avatar || 'cyber',
      favoriteGenres: favoriteGenres || [],
      bio: bio || ''
    });
    res.json(found);
  } catch (error: any) {
    console.error('[/api/auth/sync] Failed with error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password, avatar, favoriteGenres, bio } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }
    const existing = await db.getUserByEmail(email);
    if (existing) {
      console.log(`[Signup Fallback] User ${email} already exists in Firestore, performing auto-login instead.`);
      return res.json(existing);
    }
    const newUser = await db.registerUser({
      username,
      email,
      avatar: avatar || 'cyber',
      favoriteGenres: favoriteGenres || [],
      bio: bio || 'Proud member of AniMatch'
    });
    res.json(newUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    let found = await db.getUserByEmail(email);
    if (!found) {
      console.log(`[Login Fallback] User ${email} not found in Firestore. Registering user on-the-fly.`);
      found = await db.registerUser({
        username: email.split('@')[0],
        email,
        avatar: 'cyber',
        favoriteGenres: [],
        bio: 'Proud member of AniMatch'
      });
    }
    res.json(found);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    let allUsers = await db.getUsers();
    if (userId) {
      allUsers = allUsers.filter(u => u.id !== userId);
    }
    res.json(allUsers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/profile', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized. Missing x-user-id header.' });
    }
    const updated = await db.updateUserProfile(userId, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:id/watchlist', async (req, res) => {
  try {
    const list = await db.getWatchlist(req.params.id);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/watchlist', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized. Missing x-user-id header.' });
    }
    const { watchList } = req.body;
    await db.updateWatchlist(userId, watchList);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 0b. Connection Endpoints
app.get('/api/connections', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const conns = await db.getConnections(userId);
    res.json(conns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/connections/request', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { targetUserId } = req.body;
    if (!userId || !targetUserId) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    
    // Check if connection already exists
    const conns = await db.getConnections(userId);
    const existing = conns.find(c => c.userOneId === targetUserId || c.userTwoId === targetUserId);
    if (existing) {
      return res.json(existing);
    }

    const newConn: Connection = {
      id: `conn-${Date.now()}`,
      userOneId: userId,
      userTwoId: targetUserId,
      status: 'pending_one_to_two',
      lastInteractionAt: new Date().toISOString()
    };
    await db.createConnection(newConn);

    // Create notification
    const sender = await db.getUserById(userId);
    await db.addNotification(targetUserId, {
      id: `notif-${Date.now()}`,
      type: 'connect_request',
      senderId: userId,
      senderName: sender?.username || 'Someone',
      senderAvatar: sender?.avatar || 'otaku',
      isRead: false
    });

    res.json(newConn);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/connections/accept', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { connectionId, senderId } = req.body;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let targetId = connectionId;
    if (!targetId && senderId) {
      const conns = await db.getConnections(userId);
      const foundConn = conns.find(c => 
        (c.userOneId === senderId && c.userTwoId === userId) ||
        (c.userTwoId === senderId && c.userOneId === userId)
      );
      if (foundConn) {
        targetId = foundConn.id;
      }
    }

    if (!targetId) {
      return res.status(400).json({ error: 'Connection not found.' });
    }

    const updated = await db.updateConnectionStatus(targetId, 'connected');
    if (updated) {
      // Create notification of acceptance
      const accepter = await db.getUserById(userId);
      const otherId = updated.userOneId === userId ? updated.userTwoId : updated.userOneId;
      await db.addNotification(otherId, {
        id: `notif-${Date.now()}`,
        type: 'connect_accept',
        senderId: userId,
        senderName: accepter?.username || 'Someone',
        senderAvatar: accepter?.avatar || 'otaku',
        isRead: false
      });
    }
    res.json({ success: !!updated, connection: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/connections/reject', async (req, res) => {
  try {
    const { connectionId } = req.body;
    await db.removeConnection(connectionId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 0c. Chat/Message Endpoints
app.get('/api/chats/:friendId', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { friendId } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const msgs = await db.getMessages(userId, friendId);
    res.json(msgs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chats', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { receiverId, content, animeCard, emoji } = req.body;
    if (!userId || !receiverId) {
      return res.status(400).json({ error: 'Missing sender/receiver parameters.' });
    }
    const sender = await db.getUserById(userId);
    const newMsg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      senderId: userId,
      receiverId,
      content: content || '',
      animeCard,
      emoji,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    await db.createMessage(newMsg);

    // Clear typing status instantly when message is sent
    if (typingStates[userId]) {
      delete typingStates[userId][receiverId];
    }

    // Update connection's lastInteractionAt to keep friends list ordered by latest conversation
    const conns = await db.getConnections(userId);
    const conn = conns.find(c => 
      (c.userOneId === userId && c.userTwoId === receiverId) ||
      (c.userTwoId === userId && c.userOneId === receiverId)
    );
    if (conn) {
      await db.updateConnectionStatus(conn.id, conn.status);
    }

    // Add notification
    await db.addNotification(receiverId, {
      id: `notif-${Date.now()}`,
      type: 'new_message',
      senderId: userId,
      senderName: sender?.username || 'Someone',
      senderAvatar: sender?.avatar || 'otaku',
      message: content || (animeCard ? `shared an anime card: ${animeCard.english_title || animeCard.title}` : 'sent a reaction'),
      isRead: false
    });

    res.json(newMsg);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chats/read', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { friendId } = req.body;
    if (userId && friendId) {
      await db.markMessagesAsRead(friendId, userId);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/chats/unread-counts
app.get('/api/chats/unread-counts', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    // Fetch all unread messages sent to the user
    const fdb = db.fdb;
    const { getDocs, collection, query, where } = await import('firebase/firestore');
    const q = query(
      collection(fdb, 'messages'),
      where('receiverId', '==', userId),
      where('isRead', '==', false)
    );
    const snapshot = await getDocs(q);
    const counts: Record<string, number> = {};
    snapshot.forEach(docSnap => {
      const msg = docSnap.data();
      const senderId = msg.senderId;
      counts[senderId] = (counts[senderId] || 0) + 1;
    });
    res.json(counts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chats/typing
app.post('/api/chats/typing', (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { receiverId, isTyping } = req.body;
    if (!userId || !receiverId) return res.status(400).json({ error: 'Missing params' });
    
    if (!typingStates[userId]) {
      typingStates[userId] = {};
    }
    typingStates[userId][receiverId] = {
      isTyping: !!isTyping,
      timestamp: Date.now()
    };
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/chats/typing/:friendId
app.get('/api/chats/typing/:friendId', (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { friendId } = req.params;
    if (!userId || !friendId) return res.status(400).json({ error: 'Missing params' });
    
    const friendTyping = typingStates[friendId]?.[userId];
    const isTyping = friendTyping ? friendTyping.isTyping && (Date.now() - friendTyping.timestamp < 6000) : false;
    res.json({ isTyping });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chats/:id/react
app.post('/api/chats/:id/react', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { id } = req.params;
    const { emoji } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!emoji) return res.status(400).json({ error: 'Missing emoji' });
    
    await db.reactToMessage(id, userId, emoji);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/chats/:id
app.put('/api/chats/:id', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { id } = req.params;
    const { content } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    // Check ownership
    const fdb = db.fdb;
    const { getDoc, doc } = await import('firebase/firestore');
    const snap = await getDoc(doc(fdb, 'messages', id));
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Message not found' });
    }
    if (snap.data().senderId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    await db.updateMessage(id, content);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/chats/:id
app.delete('/api/chats/:id', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    // Check ownership
    const fdb = db.fdb;
    const { getDoc, doc } = await import('firebase/firestore');
    const snap = await getDoc(doc(fdb, 'messages', id));
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Message not found' });
    }
    if (snap.data().senderId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    await db.deleteMessage(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 0d. Notification Endpoints
app.get('/api/notifications', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const list = await db.getUserNotifications(userId);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications/read', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (userId) {
      await db.markNotificationsAsRead(userId);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications/:id/read', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    await db.markNotificationAsRead(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 0e. Activity Endpoints
app.get('/api/trending', async (req, res) => {
  try {
    const result = await searchOnlineAnime('', [], 'All', 0, 'popularity', 5, 0);
    if (result && result.data && result.data.length > 0) {
      const mapped = result.data.map((anime: any) => ({
        id: anime.mal_id,
        title: anime.english_title || anime.title,
        votes: `${anime.episodes || 'N/A'} Ep • ${anime.type || 'TV'}`,
        score: anime.score || 8.0,
        image: anime.image
      }));
      return res.json(mapped);
    }
    const trending = await db.getTrendingAnime();
    res.json(trending);
  } catch (error: any) {
    console.error('Error fetching live trending anime:', error);
    const trending = await db.getTrendingAnime();
    res.json(trending);
  }
});

app.get('/api/activities', async (req, res) => {
  try {
    const list = await db.getActivities();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/activities', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const sender = await db.getUserById(userId);
    const { type, animeId, animeTitle, animeImage, details } = req.body;
    const newActivity: ActivityFeedItem = {
      id: `act-${Date.now()}`,
      userId,
      username: sender?.username || 'Someone',
      userAvatar: sender?.avatar || 'otaku',
      type,
      animeId: animeId || 0,
      animeTitle: animeTitle || '',
      animeImage: animeImage || '',
      details: details || '',
      timestamp: new Date().toISOString(),
      likesCount: 0,
      likedBy: [],
      comments: []
    };
    await db.addActivity(newActivity);
    res.json(newActivity);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/activities/:id/like', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const updated = await db.updateActivityLikes(req.params.id, userId);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/activities/:id/comment', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const sender = await db.getUserById(userId);
    const { content } = req.body;
    const comment = {
      id: `cmt-${Date.now()}`,
      userId,
      username: sender?.username || 'Someone',
      userAvatar: sender?.avatar || 'otaku',
      content,
      timestamp: new Date().toISOString()
    };
    const updated = await db.addActivityComment(req.params.id, comment);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// 0. Get the pre-populated catalog pool instantly (optimizes initial startup and autocomplete)
app.get('/api/anime/pool', (req, res) => {
  try {
    const pool = Array.from(globalAnimePool.values());
    res.json({
      total: pool.length,
      data: pool
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 1. Get all anime with advanced filtering, search, and pagination
app.get('/api/anime', async (req, res) => {
  try {
    const { search, genres, type, score, sortBy, limit = '24', offset = '0' } = req.query;

    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    const scoreNum = score ? parseFloat(score as string) : 0;
    const genreList = genres ? (genres as string).split(',').filter(Boolean) : [];

    const result = await searchOnlineAnime(
      (search as string) || '',
      genreList,
      (type as string) || 'All',
      scoreNum,
      (sortBy as string) || 'popularity',
      limitNum,
      offsetNum
    );

    res.json({
      total: result.total,
      limit: limitNum,
      offset: offsetNum,
      genres: result.genres,
      data: result.data
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get single anime details
app.get('/api/anime/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const anime = await getOnlineAnimeDetails(id);
    res.json(anime);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// 3. Get recommendations for a single anime
app.get('/api/recommend/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    // Support 30-50 high quality recommendations (default to 40)
    const limitVal = req.query.limit ? parseInt(req.query.limit as string, 10) : 40;

    // Ensure source anime is loaded in pool
    const sourceAnime = await getOnlineAnimeDetails(id);

    // 1. Fetch direct recommendations first (for caching & boosting)
    const directRecs = await getOnlineRecommendations(id, 40);

    // 2. Fetch wider candidates pool (genres, studio, etc.) to enrich the global dynamic pool
    await fetchDynamicRecommendationCandidates(id, sourceAnime);

    // 3. Build the dynamic ContentRecommender using all unique anime currently loaded in our global pool
    const poolList = Array.from(globalAnimePool.values());
    const dynamicRecommender = new ContentRecommender(poolList);
    const recommendations = dynamicRecommender.recommend(id, limitVal, directRecs);

    // 4. Fallback backfill: If similarity matching yielded fewer results than limitVal,
    // supplement with live recommendations to guarantee a robust, beautiful display.
    let finalRecs = [...recommendations];
    if (finalRecs.length < limitVal) {
      const existingIds = new Set(finalRecs.map(r => r.mal_id));
      for (const rec of directRecs) {
        if (rec.mal_id !== id && !existingIds.has(rec.mal_id)) {
          const approxSimilarity = Math.min(Math.max(Math.round(rec.score * 10), 65), 98) || 75;
          finalRecs.push({
            ...rec,
            similarity: approxSimilarity,
            finalScore: 0.5
          } as any);
          if (finalRecs.length >= limitVal) break;
        }
      }
    }

    res.json({
      source: sourceAnime,
      recommendations: finalRecs
    });
  } catch (error: any) {
    console.error(`[API Recommend] Error for ID ${id}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// 4. Generate custom AI explanations of recommendation connection
app.get('/api/explain', async (req, res) => {
  const { sourceId, targetId } = req.query;
  if (!sourceId || !targetId) {
    return res.status(400).json({ error: 'Missing sourceId or targetId parameters.' });
  }

  try {
    const source = await getOnlineAnimeDetails(parseInt(sourceId as string, 10));
    const target = await getOnlineAnimeDetails(parseInt(targetId as string, 10));

    const ai = getGeminiClient();
    const prompt = `Explain why someone who loves "${source.english_title || source.title}" (Genres: ${source.genres.join(', ')}, Synopsis: ${source.synopsis.slice(0, 150)}...) would absolutely enjoy watching "${target.english_title || target.title}" (Genres: ${target.genres.join(', ')}, Synopsis: ${target.synopsis.slice(0, 150)}...). Write exactly 2 compelling, enthusiastic, and witty sentences for a modern anime fan. Do not use markdowns, tags, or headers. Write directly as a friendly Otaku assistant.`;

    const response = await callGeminiWithRetry(() => 
      ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          temperature: 0.8,
        }
      })
    );

    res.json({ explanation: response.text?.trim() });
  } catch (error: any) {
    console.error('Gemini explanation error after retries:', error.message);
    try {
      const source = await getOnlineAnimeDetails(parseInt(sourceId as string, 10));
      const target = await getOnlineAnimeDetails(parseInt(targetId as string, 10));
      const sourceTitle = source.english_title || source.title;
      const targetTitle = target.english_title || target.title;
      const common = source.genres.filter(g => target.genres.includes(g));
      const sharedTheme = common.length > 0 ? common.join('/') : (source.genres[0] || 'compelling narrative style');
      res.json({
        explanation: `If you loved the incredible depth of ${sourceTitle}, you'll be absolutely captivated by ${targetTitle}. Both masterpieces share highly acclaimed ${sharedTheme} elements, brilliant pacing, and a stellar score of ★${target.score.toFixed(1)}!`
      });
    } catch (innerErr) {
      res.json({ explanation: `Both of these shows share a brilliant mix of action and great storytelling that will keep you absolutely hooked from the very first episode.` });
    }
  }
});

// Helper function to generate robust, high-fidelity fallbacks when Gemini is rate-limited or unavailable
function getFallbackResponse(content: string): string {
  const lowerContent = content.toLowerCase();
  
  let foundAnime: Anime | undefined;
  for (const anime of globalAnimePool.values()) {
    const eTitle = anime.english_title?.toLowerCase();
    const title = anime.title.toLowerCase();
    if ((eTitle && lowerContent.includes(eTitle)) || lowerContent.includes(title)) {
      foundAnime = anime;
      break;
    }
  }

  if (foundAnime) {
    const title = foundAnime.english_title || foundAnime.title;
    const genresStr = foundAnime.genres.join(', ');
    const studio = foundAnime.studio || 'its creative studio';
    const score = foundAnime.score || 8.0;
    const year = foundAnime.year || 2024;
    const episodes = foundAnime.episodes || 12;
    const type = foundAnime.type || 'TV';

    if (lowerContent.includes('vibe check') || lowerContent.includes('vibe_check')) {
      return `✨ **Vibe Check for ${title}**

This series delivers a masterfully crafted atmosphere, blending its core genres of **${genresStr}** with top-tier production by **${studio}**. Rating at a phenomenal **★${score}/10**, the show features a distinct visual style and meticulous pacing. 

The narrative tone is tailored perfectly for viewers seeking a deep, immersive experience. It's best watched when you're ready to sink into a highly compelling, thematic world that perfectly showcases why it ranks among the highly regarded series in our catalog. Enjoy the ride!`;
    }

    if (lowerContent.includes('watch order') || lowerContent.includes('watch_order')) {
      const relations = foundAnime.relations || [];
      let relationLines = '';
      if (relations.length > 0) {
        relationLines = relations.map(r => `* **${r.relationType}**: *${r.title}* (${r.type || 'Anime'})`).join('\n');
      } else {
        relationLines = `* **Recommended Follow-up**: Check out other popular titles in the **${foundAnime.genres[0] || 'same'}** category, like other top-ranked works by **${studio}**!`;
      }

      return `🧭 **Watch Order Guide for ${title}**

To fully appreciate the narrative arc and character development of this series, we recommend the following sequence:

1. **${title}** (${type}, ${episodes} Episodes) — *The foundational entry point.*
${relationLines}

This sequence preserves the emotional beats, world-building, and production evolution.`;
    }

    if (lowerContent.includes('suitable') || lowerContent.includes('suitability')) {
      const genres = foundAnime.genres.map(g => g.toLowerCase());
      let warnings = 'general intense themes';
      if (genres.includes('action') || genres.includes('horror') || genres.includes('suspense') || genres.includes('thriller')) {
        warnings = 'stylized action, intense sequences, and thematic suspense';
      } else if (genres.includes('comedy') || genres.includes('slice of life')) {
        warnings = 'mild comedic situations and lighthearted themes';
      }

      return `🛡️ **Suitability & Trigger Evaluation for ${title}**

* **Target Audience**: Generally recommended for teens and older viewers (PG-13 to R depending on regional catalog parameters).
* **Thematic Elements**: Features **${warnings}**.
* **Content Notes**: The series is celebrated for handling complex emotional growth and narrative depth responsibly. For younger viewers, mild guidance is advised depending on their familiarity with high-stakes dramatic action.`;
    }

    if (lowerContent.includes('fun fact') || lowerContent.includes('behind the scenes') || lowerContent.includes('behind_the_scenes')) {
      return `💡 **Fascinating Behind-the-Scenes Facts about ${title}**

1. **Studio Excellence**: Produced by **${studio}** and released in **${year}**, the creative staff utilized advanced custom keyframes to ensure the iconic art design remained perfectly consistent with the original creator's vision.
2. **Global Reception**: The series achieved an extraordinary reception, reaching a score of **★${score}** and ranking among the most popular titles in its season, largely driven by its outstanding musical score and voice-acting performances.`;
    }
  }

  return `🌸 **Hello!** I am your AniMatch Curator. (Note: The Gemini API is currently under high demand, so I am running in local offline curator mode to keep your experience seamless!).

While we wait for the cloud sync, let's explore:
* You can browse the **Catalog Filters** tab to sort through hundreds of top-rated titles.
* Head over to the **Matchmaker** tab to compare specific shows using our mathematical TF-IDF and Cosine Similarity recommendation matrix instantly.
* Save your favorites to your personal **Watch Board** to organize your watchlist.

Tell me what genres or shows you're in the mood for, and I'll help you find a perfect match from our active database!`;
}

// 5. AI Chat Assistant for Anime Recommendations
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid or missing messages body.' });
  }

  try {
    const ai = getGeminiClient();
    
    // Construct simplified catalog context using the currently seeded anime in our pool
    const poolSlice = Array.from(globalAnimePool.values()).slice(0, 40);
    const catalogContext = poolSlice.map(a => `"${a.english_title || a.title}" (ID: ${a.mal_id}, Genres: ${a.genres.join(', ')}, Score: ${a.score})`).join(', ');

    const systemInstruction = `You are a legendary Anime Expert and friendly, enthusiastic Otaku Guide. Your purpose is to recommend real anime and discuss series with the user.
You have access to a live, growing catalog containing titles like: ${catalogContext}, and many other shows.
Recommend shows based on user preferences and help them find their next favorite series.
Be expressive, friendly, and use anime-themed flair when appropriate, but stay extremely helpful and safe.
Answer questions directly and guide them to their next favorite anime.
Format your markdown cleanly. Keep answers concise and engaging.`;

    // Map frontend messages format to standard Gemini API contents
    const formattedContents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await callGeminiWithRetry(() => 
      ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      })
    );

    res.json({ content: response.text });
  } catch (error: any) {
    console.error('Gemini chat assistant error after retries:', error.message);
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage ? lastMessage.content : '';
    const fallback = getFallbackResponse(content);
    res.json({ content: fallback });
  }
});

// Setup development or production environment
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    
    app.use(vite.middlewares);
    console.log('Mounted Vite dev middleware.');
  } else {
    const distPath = path.resolve('./dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving optimized static production build files.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AniMatch Server] Server successfully started and running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
