import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  limit, 
  writeBatch 
} from 'firebase/firestore';
import { User, WatchListEntry, Connection, Message, NotificationItem, ActivityFeedItem } from '../types.ts';
import { firebaseConfig } from '../config/firebase';

// Initialize Firebase Client SDK on the Server
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

export const fdb = (firebaseConfig as any).firestoreDatabaseId 
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

export function cleanFirestoreData(data: any): any {
  if (data === undefined) return null;
  if (data === null) return null;
  if (Array.isArray(data)) {
    return data.map(cleanFirestoreData);
  }
  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(data)) {
      const val = data[key];
      if (val !== undefined) {
        cleaned[key] = cleanFirestoreData(val);
      }
    }
    return cleaned;
  }
  return data;
}

// 1. getUsers
export async function getUsers(): Promise<User[]> {
  try {
    const snapshot = await getDocs(collection(fdb, 'users'));
    const list: User[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as User);
    });
    return list;
  } catch (err: any) {
    console.error("Error in getUsers:", err);
    return [];
  }
}

// 2. getUserById
export async function getUserById(id: string): Promise<User | undefined> {
  try {
    const docSnap = await getDoc(doc(fdb, 'users', id));
    if (!docSnap.exists()) return undefined;
    return docSnap.data() as User;
  } catch (err: any) {
    console.error(`Error in getUserById for ${id}:`, err);
    return undefined;
  }
}

// 3. getUserByEmail
export async function getUserByEmail(email: string): Promise<User | undefined> {
  try {
    const lowerEmail = email.toLowerCase();
    const q = query(collection(fdb, 'users'), where('email', '==', lowerEmail), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return undefined;
    return snapshot.docs[0].data() as User;
  } catch (err: any) {
    console.error(`Error in getUserByEmail for ${email}:`, err);
    return undefined;
  }
}

// 4. registerUser
export async function registerUser(fields: {
  id?: string;
  username: string;
  email: string;
  avatar: string;
  favoriteGenres?: string[];
  bio?: string;
}): Promise<User> {
  const id = fields.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const newUser: User = {
    id,
    username: fields.username,
    email: fields.email.toLowerCase(),
    avatar: fields.avatar || 'cyber',
    favoriteGenres: fields.favoriteGenres || [],
    recentlyViewedIds: [],
    joinedAt: new Date().toISOString(),
    bio: fields.bio || '',
    banner: 'indigo',
    favoriteStudios: [],
    country: '',
    language: '',
    onlineStatus: 'online',
    lastActive: new Date().toISOString(),
    badges: ['Taste Pioneer', 'Registered Fan'],
    achievements: [],
    privacy: {
      profile: 'public',
      messages: 'all',
      requests: 'all',
      activity: 'public',
      onlineStatus: 'visible'
    }
  };

  try {
    await setDoc(doc(fdb, 'users', id), cleanFirestoreData(newUser));
  } catch (err: any) {
    console.warn("DB insert conflict or set error in registerUser:", err);
  }

  const found = await getUserById(id);
  if (!found) {
    throw new Error(`Failed to register or find user with ID ${id}`);
  }
  return found;
}

// 5. syncUser
export async function syncUser(fields: {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  favoriteGenres?: string[];
  bio?: string;
}): Promise<User> {
  const emailLower = fields.email.toLowerCase();
  const existing = await getUserById(fields.id);

  if (existing) {
    // Update active status
    const updated = cleanFirestoreData({
      ...existing,
      lastActive: new Date().toISOString(),
      onlineStatus: 'online' as const
    });
    await setDoc(doc(fdb, 'users', fields.id), updated);
    return updated;
  }

  const newUser: User = {
    id: fields.id,
    username: fields.username,
    email: emailLower,
    avatar: fields.avatar || 'cyber',
    favoriteGenres: fields.favoriteGenres || [],
    recentlyViewedIds: [],
    joinedAt: new Date().toISOString(),
    bio: fields.bio || '',
    banner: 'indigo',
    favoriteStudios: [],
    country: '',
    language: '',
    onlineStatus: 'online',
    lastActive: new Date().toISOString(),
    badges: ['Taste Pioneer', 'Registered Fan'],
    achievements: [],
    privacy: {
      profile: 'public',
      messages: 'all',
      requests: 'all',
      activity: 'public',
      onlineStatus: 'visible'
    }
  };

  await setDoc(doc(fdb, 'users', fields.id), cleanFirestoreData(newUser));
  return newUser;
}

// 6. updateUserProfile
export async function updateUserProfile(id: string, updates: Partial<User>): Promise<User> {
  const existing = await getUserById(id);
  if (!existing) {
    throw new Error('User not found after update');
  }

  const valuesToUpdate: any = {};
  const allowedKeys = [
    'username', 'avatar', 'favoriteGenres', 'recentlyViewedIds',
    'bio', 'banner', 'favoriteStudios', 'country', 'language',
    'displayName', 'favoriteAnime', 'favoriteStudio',
    'lastActive', 'onlineStatus', 'achievements', 'badges', 'privacy'
  ];

  for (const key of allowedKeys) {
    if (updates[key as keyof User] !== undefined) {
      valuesToUpdate[key] = updates[key as keyof User];
    }
  }

  if (updates.lastActive) {
    valuesToUpdate.lastActive = new Date(updates.lastActive).toISOString();
  } else {
    valuesToUpdate.lastActive = new Date().toISOString();
  }

  const updatedUser = cleanFirestoreData({
    ...existing,
    ...valuesToUpdate
  });

  await setDoc(doc(fdb, 'users', id), updatedUser);
  return updatedUser;
}

// 7. getWatchlist
export async function getWatchlist(userId: string): Promise<WatchListEntry[]> {
  const docSnap = await getDoc(doc(fdb, 'watchlists', userId));
  if (!docSnap.exists()) return [];
  const data = docSnap.data();
  return (data?.entries || []) as WatchListEntry[];
}

// 8. updateWatchlist
export async function updateWatchlist(userId: string, list: WatchListEntry[]): Promise<void> {
  const payload = cleanFirestoreData({ entries: list });
  await setDoc(doc(fdb, 'watchlists', userId), payload);
}

// 9. getConnections
export async function getConnections(userId: string): Promise<Connection[]> {
  const q1Query = query(collection(fdb, 'connections'), where('userOneId', '==', userId));
  const q2Query = query(collection(fdb, 'connections'), where('userTwoId', '==', userId));

  const [q1, q2] = await Promise.all([
    getDocs(q1Query),
    getDocs(q2Query)
  ]);

  const list: Connection[] = [];
  q1.forEach(docSnap => {
    list.push(docSnap.data() as Connection);
  });
  q2.forEach(docSnap => {
    const item = docSnap.data() as Connection;
    if (!list.some(c => c.id === item.id)) {
      list.push(item);
    }
  });

  return list;
}

// 10. createConnection
export async function createConnection(connection: Connection): Promise<void> {
  const payload = cleanFirestoreData({
    ...connection,
    lastInteractionAt: new Date(connection.lastInteractionAt).toISOString()
  });
  await setDoc(doc(fdb, 'connections', connection.id), payload);
}

// 11. updateConnectionStatus
export async function updateConnectionStatus(connectionId: string, status: Connection['status']): Promise<Connection | null> {
  const docRef = doc(fdb, 'connections', connectionId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;

  const updated = {
    ...docSnap.data(),
    status,
    lastInteractionAt: new Date().toISOString()
  } as Connection;

  await setDoc(docRef, updated);
  return updated;
}

// 12. removeConnection
export async function removeConnection(connectionId: string): Promise<void> {
  await deleteDoc(doc(fdb, 'connections', connectionId));
}

// 13. getMessages
export async function getMessages(userId: string, friendId: string): Promise<Message[]> {
  const roomId = [userId, friendId].sort().join('_');
  const q = query(collection(fdb, 'messages'), where('roomId', '==', roomId));
  const snapshot = await getDocs(q);

  const msgs: Message[] = [];
  snapshot.forEach(docSnap => {
    msgs.push(docSnap.data() as Message);
  });

  return msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// 14. createMessage
export async function createMessage(msg: Message): Promise<void> {
  const roomId = [msg.senderId, msg.receiverId].sort().join('_');
  const payload = cleanFirestoreData({
    ...msg,
    roomId,
    timestamp: new Date(msg.timestamp).toISOString()
  });
  await setDoc(doc(fdb, 'messages', msg.id), payload);
}

// 15. markMessagesAsRead
export async function markMessagesAsRead(senderId: string, receiverId: string): Promise<void> {
  const roomId = [senderId, receiverId].sort().join('_');
  const q = query(
    collection(fdb, 'messages'),
    where('roomId', '==', roomId),
    where('senderId', '==', senderId),
    where('isRead', '==', false)
  );
  const snapshot = await getDocs(q);

  const batch = writeBatch(fdb);
  snapshot.forEach(docSnap => {
    batch.update(docSnap.ref, { isRead: true });
  });
  await batch.commit();
}

// 16. getUserNotifications
export async function getUserNotifications(userId: string): Promise<NotificationItem[]> {
  const q = query(collection(fdb, 'notifications'), where('userId', '==', userId));
  const snapshot = await getDocs(q);

  const list: NotificationItem[] = [];
  snapshot.forEach(docSnap => {
    list.push(docSnap.data() as NotificationItem);
  });

  return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// 17. addNotification
export async function addNotification(userId: string, notif: Omit<NotificationItem, 'timestamp'>): Promise<void> {
  const payload = cleanFirestoreData({
    ...notif,
    userId,
    timestamp: new Date().toISOString()
  });
  await setDoc(doc(fdb, 'notifications', notif.id), payload);
}

// 17b. markNotificationAsRead
export async function markNotificationAsRead(id: string): Promise<void> {
  await updateDoc(doc(fdb, 'notifications', id), { isRead: true });
}

// 18. markNotificationsAsRead
export async function markNotificationsAsRead(userId: string): Promise<void> {
  const q = query(
    collection(fdb, 'notifications'),
    where('userId', '==', userId),
    where('isRead', '==', false)
  );
  const snapshot = await getDocs(q);

  const batch = writeBatch(fdb);
  snapshot.forEach(docSnap => {
    batch.update(docSnap.ref, { isRead: true });
  });
  await batch.commit();
}

// 19. getActivities
export async function getActivities(): Promise<ActivityFeedItem[]> {
  const snapshot = await getDocs(collection(fdb, 'activityFeed'));
  const list: ActivityFeedItem[] = [];
  snapshot.forEach(docSnap => {
    list.push(docSnap.data() as ActivityFeedItem);
  });

  return list
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 100);
}

// 20. addActivity
export async function addActivity(activity: ActivityFeedItem): Promise<void> {
  const payload = cleanFirestoreData({
    ...activity,
    timestamp: new Date(activity.timestamp).toISOString()
  });
  await setDoc(doc(fdb, 'activityFeed', activity.id), payload);
}

// 21. updateActivityLikes
export async function updateActivityLikes(activityId: string, userId: string): Promise<ActivityFeedItem | null> {
  const docRef = doc(fdb, 'activityFeed', activityId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;

  const activity = docSnap.data() as ActivityFeedItem;
  const likedByList = activity.likedBy || [];
  const idx = likedByList.indexOf(userId);
  const updatedLikedBy = [...likedByList];
  let newLikesCount = activity.likesCount || 0;

  if (idx === -1) {
    updatedLikedBy.push(userId);
    newLikesCount += 1;
  } else {
    updatedLikedBy.splice(idx, 1);
    newLikesCount -= 1;
  }

  await updateDoc(docRef, {
    likedBy: updatedLikedBy,
    likesCount: newLikesCount
  });

  return {
    ...activity,
    likedBy: updatedLikedBy,
    likesCount: newLikesCount
  };
}

// 22. addActivityComment
export async function addActivityComment(activityId: string, comment: any): Promise<ActivityFeedItem | null> {
  const docRef = doc(fdb, 'activityFeed', activityId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;

  const activity = docSnap.data() as ActivityFeedItem;
  const commentsList = activity.comments || [];
  const updatedComments = [...commentsList, comment];

  await updateDoc(docRef, {
    comments: updatedComments
  });

  return {
    ...activity,
    comments: updatedComments
  };
}

// 23. getTrendingAnime
export async function getTrendingAnime(): Promise<any[]> {
  try {
    const snapshot = await getDocs(collection(fdb, 'watchlists'));
    const realList: any[] = [];
    snapshot.forEach(docSnap => {
      const entries = docSnap.data()?.entries || [];
      entries.forEach((item: any) => {
        if (item.userId && !item.userId.startsWith('mock-')) {
          realList.push(item);
        }
      });
    });

    const counts: Record<number, { count: number; anime: any }> = {};
    realList.forEach(item => {
      const a = item.anime as any;
      if (!a || !a.mal_id) return;
      if (!counts[a.mal_id]) {
        counts[a.mal_id] = { count: 0, anime: a };
      }
      counts[a.mal_id].count += 1;
    });

    const sorted = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);

    if (sorted.length > 0) {
      return sorted.map(item => ({
        id: item.anime.mal_id,
        title: item.anime.english_title || item.anime.title,
        votes: `${item.count} fan${item.count > 1 ? 's' : ''} saved`,
        score: item.anime.score || 8.0,
        image: item.anime.image
      }));
    }
  } catch (err: any) {
    console.error("Error in getTrendingAnime:", err);
  }
  return [];
}

// 24. deleteMessage
export async function deleteMessage(id: string): Promise<void> {
  await deleteDoc(doc(fdb, 'messages', id));
}

// 25. updateMessage
export async function updateMessage(id: string, content: string): Promise<void> {
  await updateDoc(doc(fdb, 'messages', id), { 
    content,
    isEdited: true 
  });
}

// 26. reactToMessage
export async function reactToMessage(id: string, userId: string, emoji: string): Promise<void> {
  const ref = doc(fdb, 'messages', id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    const reactions = data?.reactions || {};
    
    // Toggle reaction: if user already has this emoji, remove it. Otherwise add it.
    let list = reactions[emoji] || [];
    if (list.includes(userId)) {
      list = list.filter((uid: string) => uid !== userId);
    } else {
      list.push(userId);
    }
    
    if (list.length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = list;
    }
    
    await updateDoc(ref, { reactions });
  }
}

