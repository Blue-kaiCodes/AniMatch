import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, MessageSquare, BellOff, Trash2, Ban, Volume2, Send, Flame, Sparkles, 
  Tv, Eye, Smile, Image as ImageIcon, Video, Mic, Plus, Users2, Shield, Calendar, ArrowRight,
  Check, CheckCheck
} from 'lucide-react';
import { User, Anime, WatchListEntry, Connection, Message } from '../types';
import { AvatarDisplay } from './AuthModal';
import { calculateCompatibility } from '../utils/compatibility';

interface FriendsSectionProps {
  currentUser: User | null;
  watchList: WatchListEntry[];
  animeList: Anime[];
  onSelectAnime: (anime: Anime) => void;
  onSignInTrigger: () => void;
  showToast?: (message: string, type?: 'success' | 'info') => void;
  initialActiveFriendId?: string;
  onClearInitialActiveFriendId?: () => void;
}

export default function FriendsSection({
  currentUser,
  watchList,
  animeList,
  onSelectAnime,
  onSignInTrigger,
  showToast,
  initialActiveFriendId,
  onClearInitialActiveFriendId
}: FriendsSectionProps) {
  const [friends, setFriends] = useState<User[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeFriend, setActiveFriend] = useState<User | null>(null);
  
  // Chat States
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [friendIsTyping, setFriendIsTyping] = useState(false);
  const [lastSentTyping, setLastSentTyping] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mutedFriends, setMutedFriends] = useState<Set<string>>(new Set());
  const [blockedFriends, setBlockedFriends] = useState<Set<string>>(new Set());

  // Watch Party Mock state
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<string | null>(null);

  const messageEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch social connections and friend list
  const reloadSocialData = async () => {
    if (!currentUser) return;
    try {
      // Fetch connections
      const connRes = await fetch('/api/connections', {
        headers: { 'x-user-id': currentUser.id }
      });
      let connsList: Connection[] = [];
      if (connRes.ok) {
        connsList = await connRes.json();
        setConnections(connsList);
      }

      // Fetch all public users
      const usersRes = await fetch('/api/users', {
        headers: { 'x-user-id': currentUser.id }
      });
      if (usersRes.ok) {
        const usersList: User[] = await usersRes.json();
        
        // Filter down to connected friends
        const friendIds = connsList
          .filter(c => c.status === 'connected')
          .map(c => c.userOneId === currentUser.id ? c.userTwoId : c.userOneId);

        const filteredFriends = usersList.filter(u => friendIds.includes(u.id));
        setFriends(filteredFriends);
      }
    } catch (err) {
      console.error('Error loading social roster:', err);
    }
  };

  // Poll for messages in the active conversation
  const fetchMessages = async () => {
    if (!currentUser || !activeFriend) return;
    try {
      const res = await fetch(`/api/chats/${activeFriend.id}`, {
        headers: { 'x-user-id': currentUser.id }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    }
  };

  // Initial load
  useEffect(() => {
    reloadSocialData();
  }, [currentUser]);

  // Active friend routing from notification deep-link
  useEffect(() => {
    if (initialActiveFriendId && friends.length > 0) {
      const found = friends.find(f => f.id === initialActiveFriendId);
      if (found) {
        setActiveFriend(found);
        if (onClearInitialActiveFriendId) {
          onClearInitialActiveFriendId();
        }
      }
    }
  }, [initialActiveFriendId, friends, onClearInitialActiveFriendId]);

  // Poll for friend typing state
  useEffect(() => {
    if (!currentUser || !activeFriend) {
      setFriendIsTyping(false);
      return;
    }
    const checkTyping = async () => {
      try {
        const res = await fetch(`/api/chats/typing/${activeFriend.id}`, {
          headers: { 'x-user-id': currentUser.id }
        });
        if (res.ok) {
          const data = await res.json();
          setFriendIsTyping(data.isTyping);
        }
      } catch (err) {
        console.error('Error polling typing status:', err);
      }
    };
    checkTyping();
    const typingInterval = setInterval(checkTyping, 3000);
    return () => clearInterval(typingInterval);
  }, [currentUser, activeFriend]);

  // Report self typing state
  const reportTyping = async (isSelfTyping: boolean) => {
    if (!currentUser || !activeFriend) return;
    const now = Date.now();
    if (isSelfTyping && now - lastSentTyping < 3000) return; // throttle
    if (isSelfTyping) setLastSentTyping(now);
    try {
      await fetch('/api/chats/typing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ receiverId: activeFriend.id, isTyping: isSelfTyping })
      });
    } catch (err) {
      console.error('Error reporting typing status:', err);
    }
  };

  // Message Reactions support
  const handleReactToMessage = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/chats/${messageId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ emoji })
      });
      if (res.ok) {
        const updatedMsg = await res.json();
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: updatedMsg.reactions } : m));
      }
    } catch (err) {
      console.error('Error sending emoji reaction:', err);
    }
  };

  // Handle active conversation updates and message polling
  useEffect(() => {
    if (activeFriend) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 4000); // poll every 4s for real-time feel
      return () => clearInterval(interval);
    } else {
      setMessages([]);
    }
  }, [activeFriend]);

  // Scroll to bottom on messages load
  useEffect(() => {
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 120);
  }, [messages]);

  // Handle send message
  const handleSendMessage = async (e?: React.FormEvent, animeToShare?: Anime) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() && !animeToShare) return;

    if (!currentUser) {
      onSignInTrigger();
      return;
    }

    if (!activeFriend) return;

    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          receiverId: activeFriend.id,
          content: chatInput.trim(),
          animeCard: animeToShare
        })
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages(prev => [...prev, newMsg]);
        setChatInput('');
      } else {
        const data = await res.json();
        if (showToast) showToast(data.error || 'Failed to send message.', 'info');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Chat shortcuts: quick share first watchlist item
  const handleShareAnime = () => {
    if (watchList.length === 0) {
      if (showToast) {
        showToast('Your watch board is empty! Add anime first to share them in chat.', 'info');
      }
      return;
    }
    const target = watchList[0].anime;
    handleSendMessage(undefined, target);
  };

  const handleMute = (friendId: string) => {
    setMutedFriends(prev => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
        if (showToast) showToast('Conversation unmuted.', 'success');
      } else {
        next.add(friendId);
        if (showToast) showToast('Conversation muted.', 'info');
      }
      return next;
    });
  };

  const handleBlock = async (friendId: string) => {
    if (!currentUser) return;
    try {
      // Request block on server
      const res = await fetch('/api/connections/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ targetUserId: friendId })
      });

      if (res.ok) {
        setBlockedFriends(prev => {
          const next = new Set(prev);
          next.add(friendId);
          return next;
        });
        if (showToast) showToast('User blocked. They can no longer send you messages.', 'info');
        reloadSocialData();
        setActiveFriend(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!currentUser) return;
    if (confirm('Are you sure you want to remove this friend?')) {
      try {
        const res = await fetch('/api/connections/remove', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id
          },
          body: JSON.stringify({ targetUserId: friendId })
        });

        if (res.ok) {
          if (showToast) showToast('Friend removed.', 'info');
          reloadSocialData();
          setActiveFriend(null);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (!currentUser) {
    return (
      <div className="text-center py-24 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-xl mx-auto space-y-5 shadow-2xl">
        <Users className="h-12 w-12 text-indigo-500 mx-auto animate-pulse" />
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white tracking-tight">Anime Friends & Chat</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            Please sign up or log in to establish private secure chats, check real compatibility breakdowns, and connect with other community fans.
          </p>
        </div>
        <button
          onClick={onSignInTrigger}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8" id="friends-section-root">
      
      {/* Top Roster Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-indigo-400" />
              Anime Friends
            </h2>
            <p className="text-xs text-zinc-400 max-w-xl">
              Track friends' active watchlist lanes, check compatibility metrics, or send instant message cards about current seasonal titles.
            </p>
          </div>
        </div>
      </div>

      {/* Main Social Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left List Pane: Friends list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Friends roster ({friends.length})</span>
              {friends.length > 0 && (
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </h3>

            {friends.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <Users2 className="h-8 w-8 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-500 italic">No connections established yet.</p>
                <p className="text-[11px] text-zinc-600 leading-relaxed max-w-[180px] mx-auto">
                  Go to <strong className="text-zinc-400">Discover Fans</strong> tab, check compatibility scores, and send connection requests!
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {friends.map(friend => {
                  const isSelected = activeFriend?.id === friend.id;
                  const isMuted = mutedFriends.has(friend.id);
                  const isBlocked = blockedFriends.has(friend.id);
                  
                  return (
                    <button
                      key={friend.id}
                      onClick={() => setActiveFriend(friend)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-650/15 border-indigo-500/25 text-white'
                          : 'bg-zinc-950/20 border-zinc-850/60 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <AvatarDisplay id={friend.avatar} className="h-10 w-10 text-sm border border-zinc-850" />
                          <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-zinc-900 ${
                            friend.onlineStatus === 'online' ? 'bg-emerald-500' : 'bg-zinc-600'
                          }`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-zinc-100">{friend.username}</p>
                          <p className="text-[9px] text-zinc-500 truncate">
                            {friend.country || 'Global Member'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Interactive metadata mini pill */}
                      <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                        Chat
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Voice Co-Watch Room Mockup (Handcrafted UI Accent) */}
          {friends.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-3.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Tv className="h-3.5 w-3.5 text-zinc-500" />
                Live Co-Watch Rooms
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Start a high-fidelity sync room to watch trailers or streams concurrently with friends.
              </p>

              {activeVoiceChannel ? (
                <div className="flex items-center justify-between bg-zinc-950 border border-zinc-850 p-2.5 rounded-2xl animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping-once" />
                    <span className="text-[10px] font-bold text-zinc-200">{activeVoiceChannel}</span>
                  </div>
                  <button
                    onClick={() => setActiveVoiceChannel(null)}
                    className="text-[9px] font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-1 rounded"
                  >
                    Leave Room
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    const channelName = currentUser?.username 
                      ? `${currentUser.username}'s Sync Theater` 
                      : 'My Sync Theater';
                    setActiveVoiceChannel(channelName);
                    if (showToast) showToast('🔊 Joined Co-Watch Room. Invite friends to play anime in sync!', 'success');
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-850 text-[11px] font-bold text-zinc-300 py-2.5 rounded-2xl border border-zinc-850 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-zinc-500" />
                  Establish Co-Watch Room
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Pane: Active Chat workspace */}
        <div className="lg:col-span-2">
          {activeFriend ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl h-[560px] flex flex-col justify-between overflow-hidden shadow-2xl">
              
              {/* Active Conversation Header */}
              <div className="bg-zinc-950/80 px-5 py-4 border-b border-zinc-850/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <AvatarDisplay id={activeFriend.avatar} className="h-10 w-10 text-sm" />
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      {activeFriend.username}
                      <span className={`h-2 w-2 rounded-full ${
                        activeFriend.onlineStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-650'
                      }`} />
                    </h4>
                    <p className="text-[10px] text-zinc-500">
                      {activeFriend.country || 'Global'} • Primary Language: {activeFriend.language || 'English'}
                    </p>
                  </div>
                </div>

                {/* Header Action Tools */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleMute(activeFriend.id)}
                    className={`p-2 rounded-xl border text-zinc-500 hover:text-zinc-300 transition-all ${
                      mutedFriends.has(activeFriend.id) ? 'bg-zinc-850 border-zinc-700 text-indigo-400' : 'bg-zinc-900 border-zinc-850'
                    }`}
                    title="Mute chat notifications"
                  >
                    <BellOff className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleBlock(activeFriend.id)}
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-850 text-zinc-500 hover:text-red-400 hover:border-red-500/10 transition-all"
                    title="Block this user"
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemoveFriend(activeFriend.id)}
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-850 text-zinc-500 hover:text-red-400 hover:border-red-500/10 transition-all"
                    title="Remove friend"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Chat Message Scroll Window */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-zinc-950/25">
                {messages.length === 0 ? (
                  <div className="text-center py-20 space-y-2">
                    <MessageSquare className="h-8 w-8 text-zinc-700 mx-auto" />
                    <p className="text-xs text-zinc-500 italic">No messages sent in this timeline.</p>
                    <p className="text-[10px] text-zinc-600 max-w-[200px] mx-auto">
                      Say hello! Try sharing an anime from your watch list below.
                    </p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isSelf = msg.senderId === currentUser.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2.5 max-w-[85%] ${
                          isSelf ? 'ml-auto flex-row-reverse' : 'mr-auto'
                        }`}
                      >
                        <AvatarDisplay
                          id={isSelf ? currentUser.avatar : activeFriend.avatar}
                          className="h-7 w-7 text-[10px] shrink-0 border border-zinc-850 mt-0.5"
                        />
                        <div className="space-y-1 relative group/bubble">
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed break-words text-left ${
                              isSelf
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-zinc-900 text-zinc-200 border border-zinc-850/60 rounded-tl-none'
                            }`}
                          >
                            {msg.content}

                            {/* Render Embedded Anime Card */}
                            {msg.animeCard && (
                              <div
                                onClick={() => onSelectAnime(msg.animeCard!)}
                                className="mt-2.5 border border-zinc-800 hover:border-zinc-750 bg-zinc-950/80 p-2.5 rounded-xl flex gap-3 cursor-pointer group/card select-none"
                              >
                                <img
                                  src={msg.animeCard.image}
                                  alt={msg.animeCard.title}
                                  referrerPolicy="no-referrer"
                                  className="h-16 w-11 rounded object-cover shrink-0 bg-zinc-900 border border-zinc-850"
                                />
                                <div className="min-w-0 text-left flex flex-col justify-between py-0.5">
                                  <div>
                                    <h5 className="font-bold text-[10px] text-zinc-150 truncate leading-tight group-hover/card:text-indigo-400">
                                      {msg.animeCard.title}
                                    </h5>
                                    <p className="text-[9px] text-zinc-500 truncate mt-0.5">
                                      {msg.animeCard.genres.slice(0, 2).join(', ')}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] font-bold text-zinc-500 font-mono">MAL Score:</span>
                                    <span className="text-[9px] font-extrabold text-amber-400 font-mono">{msg.animeCard.score}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Hover Reactions Toolbar */}
                          <div className={`absolute top-0 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 shadow-xl z-20 gap-0.5 ${
                            isSelf ? 'right-full mr-2' : 'left-full ml-2'
                          }`}>
                            {['👍', '❤️', '😂', '😮', '😢', '🎉'].map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleReactToMessage(msg.id, emoji)}
                                className="hover:scale-[1.25] transition-transform p-1 text-xs cursor-pointer bg-transparent border-0"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>

                          {/* Reactions Display Panel */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 justify-start">
                              {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                                const list = (userIds || []) as string[];
                                if (list.length === 0) return null;
                                const hasReacted = currentUser ? list.includes(currentUser.id) : false;
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReactToMessage(msg.id, emoji)}
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-1 cursor-pointer transition-all ${
                                      hasReacted 
                                        ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400' 
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300'
                                    }`}
                                  >
                                    <span>{emoji}</span>
                                    <span className="text-[7px] font-medium">{list.length}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Message Time and Read Receipts */}
                          <div className={`flex items-center gap-1 text-[8px] font-mono text-zinc-550 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isSelf && (
                              <span>
                                {msg.isRead ? (
                                  <span className="text-emerald-400 flex items-center" title="Read by Friend">
                                    <CheckCheck className="h-2.5 w-2.5" />
                                  </span>
                                ) : (
                                  <span className="text-zinc-500 flex items-center" title="Sent">
                                    <Check className="h-2.5 w-2.5" />
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Friend Typing Indicator Bubble */}
                {friendIsTyping && (
                  <div className="flex items-center gap-2 max-w-[80%] mr-auto animate-pulse">
                    <AvatarDisplay id={activeFriend.avatar} className="h-7 w-7 text-[10px] shrink-0 border border-zinc-850" />
                    <div className="bg-zinc-900 border border-zinc-850 rounded-2xl px-4 py-2 rounded-tl-none flex items-center gap-1.5">
                      <div className="flex space-x-1 items-center h-2">
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-[10px] text-zinc-550 font-medium font-sans">typing...</span>
                    </div>
                  </div>
                )}

                <div ref={messageEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-4 bg-zinc-950/80 border-t border-zinc-850/60 shrink-0 space-y-2">
                {/* Emoji Picker Row */}
                {showEmojiPicker && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 max-w-xs flex flex-wrap gap-1.5 animate-fade-in shadow-xl select-none">
                    {['😀', '😂', '🥰', '😍', '😎', '🤩', '🤔', '🙄', '😱', '👍', '🔥', '💖', '🎉', '🌟', '👀', '🍿', '🌸', '💀'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setChatInput(prev => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="text-sm p-1 hover:scale-125 transition-transform cursor-pointer bg-transparent border-none"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <form 
                  onSubmit={(e) => {
                    handleSendMessage(e);
                    reportTyping(false);
                  }} 
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => {
                      setChatInput(e.target.value);
                      reportTyping(true);
                    }}
                    onBlur={() => reportTyping(false)}
                    placeholder={`Write a message to ${activeFriend.username}...`}
                    className="flex-1 rounded-xl bg-zinc-900 border border-zinc-850 focus:border-indigo-500/40 py-2.5 px-4 text-xs text-zinc-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                  />
                  
                  {/* Emoji Toggle button */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                      showEmojiPicker ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                    }`}
                    title="Add Emoji"
                  >
                    <Smile className="h-4 w-4" />
                  </button>

                  {/* Share Anime trigger */}
                  <button
                    type="button"
                    onClick={handleShareAnime}
                    className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-indigo-450 hover:bg-zinc-850 transition-colors cursor-pointer"
                    title="Share first item of watch list"
                  >
                    <Tv className="h-4 w-4" />
                  </button>

                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-2.5 rounded-xl transition-all shadow cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>

            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-850 rounded-3xl h-[560px] flex flex-col items-center justify-center text-center p-8 space-y-3 shadow-xl">
              <MessageSquare className="h-12 w-12 text-zinc-700 animate-pulse" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-zinc-200">No active timeline conversation</h4>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                  Select a friend from your friends roster on the left panel to display historical records or coordinate watch plans.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
