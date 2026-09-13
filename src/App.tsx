import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Search, Flame, Bookmark, Heart, User, LogOut, Settings, Menu, X, ChevronDown, Bell, Users, MessageSquare, Check, CheckCheck, Clock, Trash2 } from 'lucide-react';
import { Anime, WatchListEntry, ActiveTab, User as UserType, NotificationItem } from './types';
import { getCachedAnime } from './utils/animeCache';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './utils/firebase';

// Sub-components
import RecommendationSection from './components/RecommendationSection';
import BrowseSection from './components/BrowseSection';
import TrendingSection from './components/TrendingSection';
import WatchBoardSection from './components/WatchBoardSection';
import UserProfileSection from './components/UserProfileSection';
import DiscoverFansSection from './components/DiscoverFansSection';
import FriendsSection from './components/FriendsSection';
import ActivityFeedSection from './components/ActivityFeedSection';
import AnimeDetailModal from './components/AnimeDetailModal';
import AuthModal, { AvatarDisplay } from './components/AuthModal';
import OnboardingWizard from './components/OnboardingWizard';


// Custom Premium Geometric SVG Logo component (discovery, recommendation, connection)
export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 80 L50 20 L85 80" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-200" />
      <path d="M35 55 H65" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-200" />
      <path d="M50 20 L85 55 L50 90" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500" />
    </svg>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('discover');
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [watchList, setWatchList] = useState<WatchListEntry[]>([]);
  const [dbCount, setDbCount] = useState<number>(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Authentication State
  const [user, setUser] = useState<UserType | null>(() => {
    const saved = localStorage.getItem('animatch_active_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load WatchList when user session changes
  useEffect(() => {
    const fetchWatchList = async () => {
      if (user) {
        try {
          const res = await fetch(`/api/users/${user.id}/watchlist`);
          if (res.ok) {
            const data = await res.json();
            setWatchList(data);
          }
        } catch (err) {
          console.error('Error fetching server watchlist:', err);
        }
      } else {
        const saved = localStorage.getItem('animatch_watch_list');
        if (saved) {
          try {
            setWatchList(JSON.parse(saved));
          } catch (err) {
            console.error('Error parsing local watch list:', err);
          }
        } else {
          setWatchList([]);
        }
      }
    };
    fetchWatchList();
  }, [user]);

  // Sync WatchList when updated
  useEffect(() => {
    if (user) {
      const syncWatchList = async () => {
        try {
          await fetch('/api/users/watchlist', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': user.id
            },
            body: JSON.stringify({ watchList })
          });
        } catch (err) {
          console.error('Error syncing watchlist to server:', err);
        }
      };
      syncWatchList();
    } else {
      localStorage.setItem('animatch_watch_list', JSON.stringify(watchList));
    }
  }, [watchList, user]);

  // Load user session from Firebase Auth on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const res = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: fbUser.uid,
              email: fbUser.email,
              username: fbUser.displayName || fbUser.email?.split('@')[0] || 'otaku'
            })
          });
          if (res.ok) {
            const syncedUser = await res.json();
            setUser(syncedUser);
            localStorage.setItem('animatch_active_session', JSON.stringify(syncedUser));
          }
        } catch (err) {
          console.error('Error syncing session with backend:', err);
        }
      } else {
        // If Firebase Auth returns null, check if there's a stored fallback/server session in localStorage
        const saved = localStorage.getItem('animatch_active_session');
        if (saved) {
          try {
            setUser(JSON.parse(saved));
          } catch (e) {
            setUser(null);
            localStorage.removeItem('animatch_active_session');
          }
        } else {
          setUser(null);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeChatFriendId, setActiveChatFriendId] = useState<string | null>(null);

  // Helper: Format relative time
  const getRelativeTime = (timestamp: string) => {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return 'Yesterday';
    return `${diffDay}d ago`;
  };

  // Helper: Group notifications by day
  const groupNotifications = (notifs: NotificationItem[]) => {
    const groups: { today: NotificationItem[]; yesterday: NotificationItem[]; earlier: NotificationItem[] } = {
      today: [],
      yesterday: [],
      earlier: []
    };

    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    // Sort by timestamp descending
    const sorted = [...notifs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    sorted.forEach(n => {
      const d = new Date(n.timestamp);
      const dStr = d.toDateString();
      if (dStr === todayStr) {
        groups.today.push(n);
      } else if (dStr === yesterdayStr) {
        groups.yesterday.push(n);
      } else {
        groups.earlier.push(n);
      }
    });

    return groups;
  };

  const handleMarkNotificationRead = async (id: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error('Error marking single notification read:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!user) return;
    
    // Mark as read first
    if (!n.isRead) {
      await handleMarkNotificationRead(n.id);
    }

    // Direct to page based on type
    if (n.type === 'new_message') {
      setActiveChatFriendId(n.senderId);
      setActiveTab('friends');
    } else if (n.type === 'connect_request' || n.type === 'connect_accept') {
      setActiveTab('friends');
    } else if (n.type === 'like_post' || n.type === 'comment_post') {
      setActiveTab('feed');
      if (n.animeId) {
        setTimeout(() => {
          const el = document.getElementById(`activity-${n.animeId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-indigo-500/50', 'ring-offset-2', 'ring-offset-zinc-950');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-indigo-500/50', 'ring-offset-2', 'ring-offset-zinc-950');
            }, 3000);
          }
        }, 300);
      }
    }
    
    setIsNotificationsOpen(false);
  };

  // Sync notifications from server
  useEffect(() => {
    let active = true;
    const fetchNotifications = async (retries = 3, delay = 1500) => {
      if (!user) {
        setNotifications([]);
        return;
      }
      try {
        const res = await fetch('/api/notifications', {
          headers: { 'x-user-id': user.id }
        });
        if (res.ok && active) {
          const data = await res.json();
          setNotifications(data);
        } else if (!res.ok && retries > 0 && active) {
          setTimeout(() => fetchNotifications(retries - 1, delay * 1.5), delay);
        }
      } catch (err) {
        if (retries > 0 && active) {
          setTimeout(() => fetchNotifications(retries - 1, delay * 1.5), delay);
        } else {
          console.error('Error fetching notifications:', err);
        }
      }
    };

    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(0), 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user]);

  // Fetch full pre-populated anime pool from API on mount
  useEffect(() => {
    let active = true;
    const fetchCatalog = async (retries = 3, delay = 1500) => {
      try {
        const res = await fetch('/api/anime/pool');
        if (res.ok && active) {
          const result = await res.json();
          setAnimeList(result.data || []);
          setDbCount(result.total || 0);
        } else if (!res.ok && retries > 0 && active) {
          setTimeout(() => fetchCatalog(retries - 1, delay * 1.5), delay);
        }
      } catch (err) {
        if (retries > 0 && active) {
          setTimeout(() => fetchCatalog(retries - 1, delay * 1.5), delay);
        } else {
          console.error('Error fetching global catalog index:', err);
        }
      }
    };

    fetchCatalog();
    return () => {
      active = false;
    };
  }, []);

  // Set up Favicon Programmatically
  useEffect(() => {
    const svgString = `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
        <path d='M15 80 L50 20 L85 80' stroke='#f4f4f5' stroke-width='9' stroke-linecap='round' stroke-linejoin='round'/>
        <path d='M35 55 H65' stroke='#f4f4f5' stroke-width='9' stroke-linecap='round' stroke-linejoin='round'/>
        <path d='M50 20 L85 55 L50 90' stroke='#e11d48' stroke-width='9' stroke-linecap='round' stroke-linejoin='round'/>
      </svg>
    `;
    const encoded = encodeURIComponent(svgString.trim());
    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
    (link as any).type = 'image/svg+xml';
    (link as any).rel = 'icon';
    (link as any).href = `data:image/svg+xml,${encoded}`;
    document.getElementsByTagName('head')[0].appendChild(link);
  }, []);

  // Board item manipulations

  // 1. Add title to board
  const handleAddToWatchList = (anime: Anime, status: 'want_to_watch' | 'watching' | 'completed' = 'want_to_watch') => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    const exists = watchList.some(entry => entry.anime.mal_id === anime.mal_id);
    if (exists) return;

    const newEntry: WatchListEntry = {
      anime,
      status,
      addedAt: new Date().toISOString(),
      priority: 'medium'
    };

    setWatchList(prev => [...prev, newEntry]);
    showToast(`🌸 Added "${anime.english_title || anime.title}" to your Watch Board!`, 'success');
  };

  // Share specific progress explicitly to feed
  const handleShareToFeed = (anime: Anime, status: string) => {
    if (!user) return;
    fetch('/api/activities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id
      },
      body: JSON.stringify({
        type: status === 'completed' ? 'finish_watching' : status === 'watching' ? 'start_watching' : 'add_favorite',
        animeId: anime.mal_id,
        animeTitle: anime.english_title || anime.title,
        animeImage: anime.image,
        details: status === 'completed' ? 'Completed this masterpiece! highly recommended.' : status === 'watching' ? 'Just started watching this awesome anime!' : 'Added this title to my Plan to Watch list!'
      })
    })
    .then(res => {
      if (res.ok) {
        showToast('📣 Update shared to Community Feed!', 'success');
      }
    })
    .catch(err => console.error('Error sharing activity to feed:', err));
  };

  // Helper trigger specifically for mouse events (e.g. Card Hover triggers)
  const handleAddToWatchListFromCard = (e: React.MouseEvent, anime: Anime, status: 'want_to_watch' | 'watching' | 'completed' = 'want_to_watch') => {
    e.stopPropagation();
    handleAddToWatchList(anime, status);
  };

  // 2. Modify lane status of title
  const handleUpdateStatus = (animeId: number, status: 'want_to_watch' | 'watching' | 'completed') => {
    setWatchList(prev => prev.map(entry => {
      if (entry.anime.mal_id === animeId) {
        return { ...entry, status };
      }
      return entry;
    }));
  };

  // 3. Modify priority index of title
  const handleUpdatePriority = (animeId: number, priority: 'low' | 'medium' | 'high') => {
    setWatchList(prev => prev.map(entry => {
      if (entry.anime.mal_id === animeId) {
        return { ...entry, priority };
      }
      return entry;
    }));
  };

  // 4. Remove title from board
  const handleRemoveFromWatchList = (animeId: number) => {
    setWatchList(prev => prev.filter(entry => entry.anime.mal_id !== animeId));
  };

  // Active Select Handler which also logs recently viewed items
  const handleSelectAnimeAndLog = (anime: Anime) => {
    const cached = getCachedAnime(anime.mal_id);
    const resolvedAnime = cached || anime;
    setSelectedAnime(resolvedAnime);
    if (user) {
      const recentIds = user.recentlyViewedIds || [];
      const updatedIds = [resolvedAnime.mal_id, ...recentIds.filter(id => id !== resolvedAnime.mal_id)].slice(0, 10);
      const updatedUser: UserType = {
        ...user,
        recentlyViewedIds: updatedIds
      };
      setUser(updatedUser);
      localStorage.setItem('animatch_active_session', JSON.stringify(updatedUser));

      // Sync user profile db
      const usersRaw = localStorage.getItem('animatch_users');
      if (usersRaw) {
        try {
          const users = JSON.parse(usersRaw);
          const index = users.findIndex((u: any) => u.id === user.id);
          if (index !== -1) {
            users[index].recentlyViewedIds = updatedIds;
            localStorage.setItem('animatch_users', JSON.stringify(users));
          }
        } catch (e) {
          console.error('Error syncing recent views:', e);
        }
      }
    }
  };

  const handleAuthSuccess = (newUser: UserType) => {
    setUser(newUser);
    localStorage.setItem('animatch_active_session', JSON.stringify(newUser));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error during sign out:', err);
    }
    setUser(null);
    localStorage.removeItem('animatch_active_session');
    setActiveTab('discover');
    setIsUserDropdownOpen(false);
  };

  // Derived set of saved MAL IDs for rapid card checks
  const savedIds = new Set<number>(watchList.map(entry => entry.anime.mal_id));

  const handleAcceptConnection = async (senderId: string, notificationId: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/connections/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ senderId })
      });

      if (res.ok) {
        // Mark notification as read
        await fetch('/api/notifications/read', {
          method: 'POST',
          headers: { 'x-user-id': user.id }
        });

        // Refetch notifications
        const notifRes = await fetch('/api/notifications', {
          headers: { 'x-user-id': user.id }
        });
        if (notifRes.ok) {
          const updated = await notifRes.json();
          setNotifications(updated);
        }

        showToast('🎉 Connection request accepted! You are now Friends. Check out \'Friends & Chat\' to send messages.', 'success');
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Could not accept connection.', 'info');
      }
    } catch (err) {
      console.error('Error accepting connection on client:', err);
    }
  };

  const navTabs = [
    { id: 'feed', label: 'Home Feed', icon: <Flame className="h-4 w-4" /> },
    { id: 'discover', label: 'Matchmaker', icon: <Compass className="h-4 w-4" /> },
    { id: 'browse', label: 'Catalog Filters', icon: <Search className="h-4 w-4" /> },
    { id: 'trending', label: 'Trending & Seasonal', icon: <Flame className="h-4 w-4" /> },
    { id: 'fans', label: 'Discover Fans', icon: <Users className="h-4 w-4" /> },
    { id: 'friends', label: 'Friends & Chat', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'watch_board', label: 'Watch Board', icon: <Bookmark className="h-4 w-4" /> }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0D10] text-[#f3f4f6]" id="animatch-app-root">
      
      {/* Sticky Premium Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-[#0B0D10]/85 backdrop-blur-xl border-b border-[#1E232F]/60 px-4 sm:px-6 py-3.5 shrink-0 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo and Status indicators */}
          <div className="flex items-center gap-2.5">
            <Logo className="h-7 w-7 text-indigo-500" />
            <div>
              <h1 className="text-sm font-display font-black tracking-tight text-zinc-100 leading-none">
                AniMatch
              </h1>
              <p className="text-[10px] text-zinc-500 font-semibold tracking-wide mt-0.5">
                v4.0
              </p>
            </div>
          </div>

          {/* Desktop spotlight navigation tabs */}
          <div className="hidden xl:flex items-center gap-1 rounded-xl bg-zinc-950/45 border border-[#1E232F] p-1">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold tracking-wide transition-all cursor-pointer select-none ${
                    isActive ? 'text-indigo-400' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="spotlight-pill"
                      className="absolute inset-0 bg-indigo-500/5 border border-indigo-500/10 rounded-lg -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* User Account Controls & Notifications */}
          <div className="flex items-center gap-3">
            
            {/* Subtle Notifications Bell */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="relative p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                >
                  <Bell className="h-4 w-4" />
                  {notifications.filter(n => !n.isRead).length > 0 && (
                    <span className="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  )}
                </button>

                {/* Notifications Dropdown Container */}
                <AnimatePresence>
                  {isNotificationsOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 mt-3.5 w-80 sm:w-96 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl z-50 flex flex-col space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Social Inbox</h3>
                            {notifications.filter(n => !n.isRead).length > 0 && (
                              <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-indigo-500/20">
                                {notifications.filter(n => !n.isRead).length}
                              </span>
                            )}
                          </div>
                          {notifications.some(n => !n.isRead) && (
                            <button
                              onClick={handleMarkAllNotificationsRead}
                              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-350 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCheck className="h-3 w-3" /> Mark all read
                            </button>
                          )}
                        </div>

                        <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                          {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 space-y-2 text-zinc-500">
                              <Bell className="h-8 w-8 text-zinc-600 stroke-[1.5]" />
                              <p className="text-center text-[11px] italic">No notifications yet.</p>
                            </div>
                          ) : (
                            (() => {
                              const groups = groupNotifications(notifications);
                              return (
                                <>
                                  {/* Today Group */}
                                  {groups.today.length > 0 && (
                                    <div className="space-y-1.5">
                                      <h4 className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
                                        <span className="h-1 w-1 rounded-full bg-indigo-500" /> Today
                                      </h4>
                                      {groups.today.map(n => (
                                        <div
                                          key={n.id}
                                          onClick={() => handleNotificationClick(n)}
                                          className={`group relative p-2.5 rounded-xl border text-[11px] flex gap-2.5 transition-all cursor-pointer select-none ${
                                            n.isRead
                                              ? 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/40'
                                              : 'bg-zinc-900 border-zinc-850 text-zinc-200 hover:bg-zinc-850/50'
                                          }`}
                                        >
                                          <div className="relative shrink-0">
                                            <AvatarDisplay id={n.senderAvatar} className="h-8 w-8 text-xs border border-zinc-800" />
                                            {!n.isRead && (
                                              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-indigo-500 ring-1 ring-zinc-950 animate-pulse" />
                                            )}
                                          </div>
                                          <div className="min-w-0 flex-1 space-y-1">
                                            <p className="leading-relaxed text-left">
                                              <span className="font-bold text-zinc-100">{n.senderName}</span>{' '}
                                              {n.type === 'connect_request' && 'sent you a friend request'}
                                              {n.type === 'connect_accept' && 'accepted your friend request!'}
                                              {n.type === 'new_message' && 'sent you a direct message'}
                                              {n.type === 'like_post' && 'liked your community post'}
                                              {n.type === 'comment_post' && 'commented on your review'}
                                              {(!['connect_request', 'connect_accept', 'new_message', 'like_post', 'comment_post'].includes(n.type)) && n.message}
                                            </p>
                                            <div className="flex items-center gap-1.5 text-[9px] text-zinc-500">
                                              <Clock className="h-2.5 w-2.5 shrink-0" />
                                              <span>{getRelativeTime(n.timestamp)}</span>
                                            </div>

                                            {n.type === 'connect_request' && !n.isRead && (
                                              <div className="flex items-center gap-2 mt-2">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAcceptConnection(n.senderId, n.id);
                                                  }}
                                                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2.5 py-1 rounded-lg text-[9px] transition-all cursor-pointer shadow-sm"
                                                >
                                                  Accept
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkNotificationRead(n.id);
                                                  }}
                                                  className="bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-bold px-2.5 py-1 rounded-lg text-[9px] transition-all cursor-pointer"
                                                >
                                                  Ignore
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                          {!n.isRead && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleMarkNotificationRead(n.id);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-opacity self-center shrink-0"
                                              title="Mark as read"
                                            >
                                              <Check className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Yesterday Group */}
                                  {groups.yesterday.length > 0 && (
                                    <div className="space-y-1.5">
                                      <h4 className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                        Yesterday
                                      </h4>
                                      {groups.yesterday.map(n => (
                                        <div
                                          key={n.id}
                                          onClick={() => handleNotificationClick(n)}
                                          className={`group relative p-2.5 rounded-xl border text-[11px] flex gap-2.5 transition-all cursor-pointer select-none ${
                                            n.isRead
                                              ? 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/40'
                                              : 'bg-zinc-900 border-zinc-850 text-zinc-200 hover:bg-zinc-850/50'
                                          }`}
                                        >
                                          <div className="relative shrink-0">
                                            <AvatarDisplay id={n.senderAvatar} className="h-8 w-8 text-xs border border-zinc-800" />
                                            {!n.isRead && (
                                              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-indigo-500 ring-1 ring-zinc-950 animate-pulse" />
                                            )}
                                          </div>
                                          <div className="min-w-0 flex-1 space-y-1">
                                            <p className="leading-relaxed text-left">
                                              <span className="font-bold text-zinc-100">{n.senderName}</span>{' '}
                                              {n.type === 'connect_request' && 'sent you a friend request'}
                                              {n.type === 'connect_accept' && 'accepted your friend request!'}
                                              {n.type === 'new_message' && 'sent you a direct message'}
                                              {n.type === 'like_post' && 'liked your community post'}
                                              {n.type === 'comment_post' && 'commented on your review'}
                                              {(!['connect_request', 'connect_accept', 'new_message', 'like_post', 'comment_post'].includes(n.type)) && n.message}
                                            </p>
                                            <div className="flex items-center gap-1.5 text-[9px] text-zinc-500">
                                              <Clock className="h-2.5 w-2.5 shrink-0" />
                                              <span>{getRelativeTime(n.timestamp)}</span>
                                            </div>

                                            {n.type === 'connect_request' && !n.isRead && (
                                              <div className="flex items-center gap-2 mt-2">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAcceptConnection(n.senderId, n.id);
                                                  }}
                                                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2.5 py-1 rounded-lg text-[9px] transition-all cursor-pointer shadow-sm"
                                                >
                                                  Accept
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkNotificationRead(n.id);
                                                  }}
                                                  className="bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-bold px-2.5 py-1 rounded-lg text-[9px] transition-all cursor-pointer"
                                                >
                                                  Ignore
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                          {!n.isRead && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleMarkNotificationRead(n.id);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-opacity self-center shrink-0"
                                              title="Mark as read"
                                            >
                                              <Check className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Earlier Group */}
                                  {groups.earlier.length > 0 && (
                                    <div className="space-y-1.5">
                                      <h4 className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                        Earlier
                                      </h4>
                                      {groups.earlier.map(n => (
                                        <div
                                          key={n.id}
                                          onClick={() => handleNotificationClick(n)}
                                          className={`group relative p-2.5 rounded-xl border text-[11px] flex gap-2.5 transition-all cursor-pointer select-none ${
                                            n.isRead
                                              ? 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/40'
                                              : 'bg-zinc-900 border-zinc-850 text-zinc-200 hover:bg-zinc-850/50'
                                          }`}
                                        >
                                          <div className="relative shrink-0">
                                            <AvatarDisplay id={n.senderAvatar} className="h-8 w-8 text-xs border border-zinc-800" />
                                            {!n.isRead && (
                                              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-indigo-500 ring-1 ring-zinc-950 animate-pulse" />
                                            )}
                                          </div>
                                          <div className="min-w-0 flex-1 space-y-1">
                                            <p className="leading-relaxed text-left">
                                              <span className="font-bold text-zinc-100">{n.senderName}</span>{' '}
                                              {n.type === 'connect_request' && 'sent you a friend request'}
                                              {n.type === 'connect_accept' && 'accepted your friend request!'}
                                              {n.type === 'new_message' && 'sent you a direct message'}
                                              {n.type === 'like_post' && 'liked your community post'}
                                              {n.type === 'comment_post' && 'commented on your review'}
                                              {(!['connect_request', 'connect_accept', 'new_message', 'like_post', 'comment_post'].includes(n.type)) && n.message}
                                            </p>
                                            <div className="flex items-center gap-1.5 text-[9px] text-zinc-500">
                                              <Clock className="h-2.5 w-2.5 shrink-0" />
                                              <span>{getRelativeTime(n.timestamp)}</span>
                                            </div>

                                            {n.type === 'connect_request' && !n.isRead && (
                                              <div className="flex items-center gap-2 mt-2">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAcceptConnection(n.senderId, n.id);
                                                  }}
                                                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2.5 py-1 rounded-lg text-[9px] transition-all cursor-pointer shadow-sm"
                                                >
                                                  Accept
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkNotificationRead(n.id);
                                                  }}
                                                  className="bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-bold px-2.5 py-1 rounded-lg text-[9px] transition-all cursor-pointer"
                                                >
                                                  Ignore
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                          {!n.isRead && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleMarkNotificationRead(n.id);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-opacity self-center shrink-0"
                                              title="Mark as read"
                                            >
                                              <Check className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              );
                            })()
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 p-1.5 pr-2.5 text-xs text-zinc-300 font-semibold hover:border-zinc-700 transition-all"
                >
                  <AvatarDisplay id={user.avatar} className="h-6 w-6 text-xs" />
                  <span className="max-w-[80px] truncate hidden sm:inline">{user.username}</span>
                  <ChevronDown className={`h-3 w-3 text-zinc-500 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isUserDropdownOpen && (
                    <>
                      {/* Invisible clickout shield */}
                      <div className="fixed inset-0 z-40" onClick={() => setIsUserDropdownOpen(false)} />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute right-0 mt-2 w-48 rounded-2xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl z-50 flex flex-col"
                      >
                        <button
                          onClick={() => {
                            setActiveTab('profile');
                            setIsUserDropdownOpen(false);
                          }}
                          className="flex items-center gap-2 rounded-xl p-2.5 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-850 hover:text-white transition-all"
                        >
                          <User className="h-4 w-4 text-zinc-400" />
                          My Profile
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('profile');
                            setIsUserDropdownOpen(false);
                          }}
                          className="flex items-center gap-2 rounded-xl p-2.5 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-850 hover:text-white transition-all"
                        >
                          <Settings className="h-4 w-4 text-zinc-400" />
                          Account Settings
                        </button>
                        <div className="h-px bg-zinc-800/80 my-1.5" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 rounded-xl p-2.5 text-left text-xs font-medium text-red-400 hover:bg-red-500/5 transition-all cursor-pointer"
                        >
                          <LogOut className="h-4 w-4 text-red-400" />
                          Sign Out
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs px-4 py-2.5 cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
              >
                <User className="h-3.5 w-3.5" />
                Sign In
              </button>
            )}

            {/* Mobile Hamburger menu */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="xl:hidden mt-4 pt-4 border-t border-[#1E232F]/50 flex flex-col gap-1.5"
            >
              {navTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2.5 w-full p-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      isActive ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15' : 'text-zinc-400 hover:bg-zinc-900'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Primary Main Content Viewport container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="h-full"
          >
            {activeTab === 'feed' && (
              <ActivityFeedSection
                currentUser={user}
                animeList={animeList}
                watchList={watchList}
                onSelectAnime={handleSelectAnimeAndLog}
                onSignInTrigger={() => setIsAuthOpen(true)}
                showToast={showToast}
              />
            )}

            {activeTab === 'discover' && (
              <RecommendationSection
                animeList={animeList}
                watchList={watchList}
                onAddToWatchList={handleAddToWatchListFromCard}
                onRemoveFromWatchList={(e, animeId) => {
                  e.stopPropagation();
                  handleRemoveFromWatchList(animeId);
                }}
                onSelectAnime={handleSelectAnimeAndLog}
              />
            )}

            {activeTab === 'browse' && (
              <BrowseSection
                watchList={watchList}
                onAddToWatchList={handleAddToWatchListFromCard}
                onRemoveFromWatchList={(e, animeId) => {
                  e.stopPropagation();
                  handleRemoveFromWatchList(animeId);
                }}
                onSelectAnime={handleSelectAnimeAndLog}
              />
            )}

            {activeTab === 'trending' && (
              <TrendingSection
                watchList={watchList}
                onAddToWatchList={handleAddToWatchListFromCard}
                onRemoveFromWatchList={(e, animeId) => {
                  e.stopPropagation();
                  handleRemoveFromWatchList(animeId);
                }}
                onSelectAnime={handleSelectAnimeAndLog}
              />
            )}

            {activeTab === 'fans' && (
              <DiscoverFansSection
                currentUser={user}
                currentUserWatchList={watchList}
                animeList={animeList}
                onSelectAnime={handleSelectAnimeAndLog}
                onSignInTrigger={() => setIsAuthOpen(true)}
                showToast={showToast}
              />
            )}

            {activeTab === 'friends' && (
              <FriendsSection
                currentUser={user}
                watchList={watchList}
                animeList={animeList}
                onSelectAnime={handleSelectAnimeAndLog}
                onSignInTrigger={() => setIsAuthOpen(true)}
                showToast={showToast}
                initialActiveFriendId={activeChatFriendId}
                onClearInitialActiveFriendId={() => setActiveChatFriendId(null)}
              />
            )}

            {activeTab === 'watch_board' && (
              <WatchBoardSection
                watchList={watchList}
                onUpdateStatus={handleUpdateStatus}
                onUpdatePriority={handleUpdatePriority}
                onRemove={handleRemoveFromWatchList}
                onSelectAnime={handleSelectAnimeAndLog}
                isGuest={!user}
                onSignInTrigger={() => setIsAuthOpen(true)}
                onShareToFeed={handleShareToFeed}
              />
            )}

            {activeTab === 'profile' && user && (
              <UserProfileSection
                user={user}
                watchList={watchList}
                animeList={animeList}
                onUpdateUser={setUser}
                onLogout={handleLogout}
                onSelectAnime={handleSelectAnimeAndLog}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Single Drawer Overlay for Anime Details Modal */}
      <AnimeDetailModal
        anime={selectedAnime}
        onClose={() => setSelectedAnime(null)}
        onAddToWatchList={handleAddToWatchList}
        onRemoveFromWatchList={handleRemoveFromWatchList}
        watchList={watchList}
        onSelectAnime={handleSelectAnimeAndLog}
      />

      {/* Auth System Portal Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Onboarding Wizard for brand-new users */}
      {user && (!user.country && !user.language) && (!user.joinedAt || (new Date().getTime() - new Date(user.joinedAt).getTime() < 15 * 60 * 1000)) && (
        <OnboardingWizard
          user={user}
          animeList={animeList}
          onComplete={(updatedUser) => {
            setUser(updatedUser);
            localStorage.setItem('animatch_active_session', JSON.stringify(updatedUser));
            showToast('Welcome aboard! Your custom fan identity is successfully configured.', 'success');
          }}
        />
      )}
      
      {/* Handcrafted High-End Minimal Footer */}
      <footer className="py-10 px-6 sm:px-8 border-t border-[#1E232F]/50 bg-zinc-950/20 text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Logo className="h-5 w-5 text-zinc-400" />
            <span className="text-xs font-display font-extrabold tracking-wider uppercase text-zinc-400">
              AniMatch
            </span>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-6 text-[11px] font-medium tracking-wide">
            <a href="#about" onClick={(e) => { e.preventDefault(); showToast("AniMatch is a tailored discovery platform designed to perfectly align your personal tastes with matching anime series.", "info"); }} className="hover:text-indigo-400 transition-colors">About</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); showToast("Reach our team at support@animatch.com for content suggestions and community support.", "info"); }} className="hover:text-indigo-400 transition-colors">Contact</a>
            <a href="#privacy" onClick={(e) => { e.preventDefault(); showToast("Privacy: AniMatch securely processes all preference models locally in your browser workspace.", "info"); }} className="hover:text-indigo-400 transition-colors">Privacy Policy</a>
            <a href="#terms" onClick={(e) => { e.preventDefault(); showToast("Terms: Authorized for personal entertainment search. All metadata belongs to respective production studios.", "info"); }} className="hover:text-indigo-400 transition-colors">Terms of Service</a>
          </div>

          <p className="text-[10px] font-mono tracking-wide">
            &copy; {new Date().getFullYear()} AniMatch. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Premium Custom Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-zinc-900 border border-indigo-500/30 text-zinc-100 shadow-2xl max-w-sm sm:max-w-md font-sans text-xs"
          >
            <div className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
            <p className="flex-1 font-medium">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
