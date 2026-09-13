import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, Users, MessageSquare, Hand, Compass, Check, ShieldAlert, 
  ArrowRight, Bookmark, Flame, Search, Globe, Languages, Activity 
} from 'lucide-react';
import { User, Anime, WatchListEntry, Connection } from '../types';
import { AvatarDisplay } from './AuthModal';
import { calculateCompatibility } from '../utils/compatibility';
import { fetchOnlineGenresAndTags, BACKUP_GENRES_AND_TAGS } from '../utils/liveAnimeProvider';

interface DiscoverFansSectionProps {
  currentUser: User | null;
  currentUserWatchList: WatchListEntry[];
  animeList: Anime[];
  onSelectAnime: (anime: Anime) => void;
  onSignInTrigger: () => void;
  showToast?: (message: string, type?: 'success' | 'info') => void;
}

export default function DiscoverFansSection({
  currentUser,
  currentUserWatchList,
  animeList,
  onSelectAnime,
  onSignInTrigger,
  showToast
}: DiscoverFansSectionProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [wavingIds, setWavingIds] = useState<Set<string>>(new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [allGenres, setAllGenres] = useState<string[]>(BACKUP_GENRES_AND_TAGS);

  // Load all available genres and tags on mount
  useEffect(() => {
    fetchOnlineGenresAndTags()
      .then(genres => {
        if (genres && genres.length > 0) {
          setAllGenres(genres);
        }
      })
      .catch(err => {
        console.error('[Discover Fans] Failed to fetch live genres:', err);
      });
  }, []);

  // Filter States
  const [filterGenre, setFilterGenre] = useState('');
  const [filterFavAnime, setFilterFavAnime] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterOnlineStatus, setFilterOnlineStatus] = useState('all');
  const [filterCurrentlyWatching, setFilterCurrentlyWatching] = useState('');
  const [filterCompatibility, setFilterCompatibility] = useState('all');

  // Fetch users and connections from backend APIs
  const fetchSocialData = async () => {
    try {
      const usersRes = await fetch('/api/users', {
        headers: currentUser ? { 'x-user-id': currentUser.id } : {}
      });
      if (usersRes.ok) {
        const data = await usersRes.json();
        // Exclude current user if logged in
        if (currentUser) {
          setUsers(data.filter((u: User) => u.id !== currentUser.id));
        } else {
          setUsers(data);
        }
      }

      if (currentUser) {
        const connsRes = await fetch('/api/connections', {
          headers: { 'x-user-id': currentUser.id }
        });
        if (connsRes.ok) {
          const data = await connsRes.json();
          setConnections(data);
        }
      } else {
        setConnections([]);
      }
    } catch (err) {
      console.error('Error fetching live social users:', err);
    }
  };

  useEffect(() => {
    fetchSocialData();
    const interval = setInterval(fetchSocialData, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Handlers for interactive actions
  const handleConnect = async (targetUserId: string) => {
    if (!currentUser) {
      onSignInTrigger();
      return;
    }

    try {
      const res = await fetch('/api/connections/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ targetUserId })
      });

      if (res.ok) {
        if (showToast) {
          showToast('✉️ Connection request sent successfully! Check notifications.', 'success');
        }
        fetchSocialData();
      } else {
        const data = await res.json();
        if (showToast) {
          showToast(data.error || 'Could not send connection request.', 'info');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleWave = async (targetUserId: string) => {
    if (!currentUser) {
      onSignInTrigger();
      return;
    }

    setWavingIds(prev => {
      const updated = new Set(prev);
      updated.add(targetUserId);
      return updated;
    });

    try {
      const res = await fetch('/api/connections/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ targetUserId, wave: true })
      });

      if (res.ok) {
        if (showToast) {
          showToast(`👋 You waved at ${users.find(u => u.id === targetUserId)?.username || 'them'}!`, 'success');
        }
        fetchSocialData();
      }
    } catch (err) {
      console.error(err);
    }

    setTimeout(() => {
      setWavingIds(prev => {
        const updated = new Set(prev);
        updated.delete(targetUserId);
        return updated;
      });
    }, 1500);
  };

  const handleFollow = (targetUserId: string) => {
    if (!currentUser) {
      onSignInTrigger();
      return;
    }

    setFollowingIds(prev => {
      const updated = new Set(prev);
      if (updated.has(targetUserId)) {
        updated.delete(targetUserId);
        if (showToast) showToast('Stopped following activity updates.', 'info');
      } else {
        updated.add(targetUserId);
        if (showToast) showToast('Now following! You will see their taste updates on the home feed.', 'success');
      }
      return updated;
    });
  };

  // Real-time filtering logic
  const filteredUsers = users.filter(item => {
    // 1. Genre filter
    if (filterGenre) {
      const hasGenre = (item.favoriteGenres || []).includes(filterGenre);
      if (!hasGenre) return false;
    }

    // 2. Online status filter
    if (filterOnlineStatus !== 'all') {
      const isOnline = item.onlineStatus === 'online';
      if (filterOnlineStatus === 'online' && !isOnline) return false;
      if (filterOnlineStatus === 'offline' && isOnline) return false;
    }

    // 3. Country filter
    if (filterCountry) {
      const countryMatch = (item.country || '').toLowerCase().includes(filterCountry.toLowerCase());
      if (!countryMatch) return false;
    }

    // 4. Language filter
    if (filterLanguage) {
      const langMatch = (item.language || '').toLowerCase().includes(filterLanguage.toLowerCase());
      if (!langMatch) return false;
    }

    // 5. Favorite Anime filter
    const targetWL = (item as any).watchlist || [];
    if (filterFavAnime) {
      const hasFavAnime = targetWL.some((e: WatchListEntry) => 
        e.anime.title.toLowerCase().includes(filterFavAnime.toLowerCase()) || 
        e.anime.english_title?.toLowerCase().includes(filterFavAnime.toLowerCase())
      );
      if (!hasFavAnime) return false;
    }

    // 6. Currently watching filter
    if (filterCurrentlyWatching) {
      const isWatchingAnime = targetWL.some((e: WatchListEntry) => 
        e.status === 'watching' && (
          e.anime.title.toLowerCase().includes(filterCurrentlyWatching.toLowerCase()) || 
          e.anime.english_title?.toLowerCase().includes(filterCurrentlyWatching.toLowerCase())
        )
      );
      if (!isWatchingAnime) return false;
    }

    // 7. Compatibility filter
    if (filterCompatibility !== 'all' && currentUser) {
      const comp = calculateCompatibility(currentUser, item, currentUserWatchList, targetWL);
      const minScore = parseInt(filterCompatibility);
      if (comp.score < minScore) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6" id="discover-fans-root">
      
      {/* Redesigned Compact Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-indigo-950/20 border border-zinc-800 p-5 sm:p-6 shadow-md">
        <div className="absolute inset-0 bg-radial-gradient from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-sans font-bold text-white tracking-tight flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <Users className="h-4 w-4 text-indigo-400" />
              </div>
              Discover Fans
            </h2>
            <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
              Meet other real anime fans based on taste-matching algorithms. Set filters below to find your niche.
            </p>
          </div>

          {!currentUser && (
            <button
              onClick={onSignInTrigger}
              className="sm:self-center shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-all duration-200"
            >
              Sign In to Calculate Match %
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Premium Search & Filter Toolbar */}
      <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-850 rounded-xl p-4 space-y-3 shadow-md">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Search className="h-3.5 w-3.5 text-indigo-400" />
          Refine Discover Roster
        </h3>

        {/* Row 1: Anime Interests */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Favorite Anime Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search Favorite Anime..."
              value={filterFavAnime}
              onChange={(e) => setFilterFavAnime(e.target.value)}
              className="w-full pl-9 rounded-lg bg-zinc-950/70 border border-zinc-800/80 focus:border-indigo-500/50 py-1.5 px-3 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder-zinc-500"
            />
          </div>

          {/* Currently Watching Search */}
          <div className="relative">
            <Activity className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search Currently Watching..."
              value={filterCurrentlyWatching}
              onChange={(e) => setFilterCurrentlyWatching(e.target.value)}
              className="w-full pl-9 rounded-lg bg-zinc-950/70 border border-zinc-800/80 focus:border-indigo-500/50 py-1.5 px-3 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder-zinc-500"
            />
          </div>

          {/* Genre Selection */}
          <select
            value={filterGenre}
            onChange={(e) => setFilterGenre(e.target.value)}
            className="w-full rounded-lg bg-zinc-950/70 border border-zinc-800/80 focus:border-indigo-500/50 py-1.5 px-3 text-xs text-zinc-350 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer"
          >
            <option value="">All Genres / Tags</option>
            {allGenres.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Row 2: User Status & Region */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Compatibility score filter */}
          <select
            value={filterCompatibility}
            disabled={!currentUser}
            onChange={(e) => setFilterCompatibility(e.target.value)}
            className="w-full rounded-lg bg-zinc-950/70 border border-zinc-800/80 focus:border-indigo-500/50 py-1.5 px-3 text-xs text-zinc-355 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <option value="all">{currentUser ? 'All Scores' : 'Unlock Score Match'}</option>
            <option value="70">70% + Match</option>
            <option value="80">80% + Match</option>
            <option value="90">90% + Match</option>
          </select>

          {/* Online Status */}
          <select
            value={filterOnlineStatus}
            onChange={(e) => setFilterOnlineStatus(e.target.value)}
            className="w-full rounded-lg bg-zinc-950/70 border border-zinc-800/80 focus:border-indigo-500/50 py-1.5 px-3 text-xs text-zinc-355 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer"
          >
            <option value="all">Any Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>

          {/* Country Filter */}
          <div className="relative">
            <Globe className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Country..."
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="w-full pl-9 rounded-lg bg-zinc-950/70 border border-zinc-800/80 focus:border-indigo-500/50 py-1.5 px-3 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder-zinc-500"
            />
          </div>

          {/* Language Filter */}
          <div className="relative">
            <Languages className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Language..."
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="w-full pl-9 rounded-lg bg-zinc-950/70 border border-zinc-800/80 focus:border-indigo-500/50 py-1.5 px-3 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder-zinc-500"
            />
          </div>
        </div>

        {/* Clear Filter Indicators */}
        {(filterGenre || filterFavAnime || filterCountry || filterLanguage || filterOnlineStatus !== 'all' || filterCurrentlyWatching || filterCompatibility !== 'all') && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setFilterGenre('');
                setFilterFavAnime('');
                setFilterCountry('');
                setFilterLanguage('');
                setFilterOnlineStatus('all');
                setFilterCurrentlyWatching('');
                setFilterCompatibility('all');
              }}
              className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-350 bg-indigo-500/5 hover:bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/10 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Grid of Recommended Fans */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/40 border border-zinc-850 rounded-2xl p-6 space-y-2">
          <p className="text-zinc-400 font-semibold text-sm">No real fans found matching current filters.</p>
          <p className="text-xs text-zinc-600">Try adjusting your filter search terms or categories above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredUsers.map((item) => {
            const targetWL = (item as any).watchlist || [];

            // Compute dynamic compatibility score
            const defaultUserPlaceholder: User = {
              id: 'placeholder-user',
              username: 'You',
              email: 'placeholder@placeholder.com',
              avatar: 'cyber',
              favoriteGenres: ['Action', 'Fantasy'],
              recentlyViewedIds: [],
              joinedAt: ''
            };
            
            const comp = calculateCompatibility(
              currentUser || defaultUserPlaceholder,
              item,
              currentUserWatchList.length > 0 ? currentUserWatchList : targetWL, // backfill
              targetWL
            );

            // Check connection status
            const conn = connections.find(
              c => (c.userOneId === currentUser?.id && c.userTwoId === item.id) ||
                   (c.userTwoId === currentUser?.id && c.userOneId === item.id)
            );

            const isWaving = wavingIds.has(item.id);
            const isFollowing = followingIds.has(item.id);

            return (
              <motion.div
                key={item.id}
                className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/80 rounded-2xl p-5 relative flex flex-col justify-between hover:border-zinc-700/60 hover:bg-zinc-900/60 transition-all duration-300 group shadow-md hover:shadow-xl"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                {/* Top Row: User Avatar & Basic Info */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <AvatarDisplay id={item.avatar} className="h-14 w-14 text-xl border border-zinc-800/80" />
                        {/* Online Status Pulse */}
                        <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-zinc-900 ${
                          item.onlineStatus === 'online' ? 'bg-emerald-500 animate-pulse' :
                          item.onlineStatus === 'idle' ? 'bg-amber-500' : 'bg-zinc-650'
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-sans font-bold text-base text-zinc-100 flex items-center gap-1.5 truncate">
                          <span className="truncate">{item.username}</span>
                          {item.onlineStatus === 'online' && (
                            <span className="shrink-0 text-[8px] font-sans font-bold uppercase tracking-wide text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                              Active
                            </span>
                          )}
                        </h3>
                        <div className="flex flex-col gap-0.5 text-[10px] text-zinc-400 font-sans mt-0.5">
                          {item.country && (
                            <span className="flex items-center gap-1 text-zinc-450">
                              <Globe className="h-3 w-3 text-zinc-600" />
                              {item.country} {item.language ? `(${item.language})` : ''}
                            </span>
                          )}
                          <span className="text-zinc-500">
                            Joined {new Date(item.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Styled Premium Match Score Indicator */}
                    <div className="shrink-0 flex flex-col items-center justify-center p-2 bg-indigo-500/5 border border-indigo-500/15 rounded-xl min-w-[56px] text-center">
                      <span className="text-lg font-mono font-bold text-indigo-400 leading-none">
                        {currentUser ? `${comp.score}%` : '??%'}
                      </span>
                      <span className="text-[8px] font-semibold text-indigo-400/60 uppercase tracking-wider mt-0.5">
                        Match
                      </span>
                    </div>
                  </div>

                  {/* Bio text (sizes naturally, no empty whitespace) */}
                  <p className="text-xs text-zinc-350 leading-relaxed italic">
                    "{item.bio || 'Anime fan who loves discovering hidden gems and sharing deep lore.'}"
                  </p>

                  {/* Genres & Highlights Panel */}
                  <div className="space-y-2 pt-1">
                    {/* Compact Genres Pill Display */}
                    <div className="flex flex-wrap gap-1">
                      {(item.favoriteGenres || []).slice(0, 4).map(genre => {
                        const isShared = (currentUser?.favoriteGenres || []).includes(genre);
                        return (
                          <span
                            key={genre}
                            className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border transition-colors ${
                              isShared
                                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                                : 'bg-zinc-950/40 border-zinc-850 text-zinc-500'
                            }`}
                          >
                            {genre}
                          </span>
                        );
                      })}
                    </div>

                    {/* Premium Highlights Panel */}
                    <div className="bg-zinc-950/30 border border-zinc-850/60 p-2.5 rounded-xl space-y-2">
                      <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1">
                        <Compass className="h-3 w-3 text-indigo-400" />
                        Taste Breakdown
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-zinc-500 block">Shared Genres</span>
                          <p className="text-zinc-300 font-semibold truncate mt-0.5">
                            {currentUser && comp.sharedGenres.length > 0 ? comp.sharedGenres.slice(0, 2).join(', ') : 'None'}
                          </p>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Shared Favorites</span>
                          <p className="text-zinc-300 font-semibold truncate mt-0.5">
                            {currentUser && comp.sharedFavorites.length > 0 ? comp.sharedFavorites.slice(0, 2).join(', ') : 'None'}
                          </p>
                        </div>
                      </div>

                      {currentUser && comp.bothWatching && comp.bothWatching.length > 0 && (
                        <div className="text-[10px] border-t border-zinc-850/45 pt-1.5 flex items-center gap-1.5">
                          <Flame className="h-3 w-3 text-amber-500 shrink-0" />
                          <span className="text-zinc-500">Both Watching:</span>
                          <span className="text-amber-400 font-bold truncate">{comp.bothWatching[0]}</span>
                        </div>
                      )}

                      {currentUser && comp.suggestedPrompt && (
                        <div className="text-[10px] text-indigo-300 bg-indigo-950/20 p-2 rounded-lg leading-relaxed italic border border-indigo-950/20 mt-1">
                          "{comp.suggestedPrompt}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Redesigned Connected Actions Area */}
                <div className="flex gap-2 mt-4 pt-3.5 border-t border-zinc-800/40">
                  {/* 1. Connect Action */}
                  {conn?.status === 'connected' ? (
                    <button
                      disabled
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold py-2 cursor-not-allowed"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Anime Friends
                    </button>
                  ) : conn?.status === 'pending_one_to_two' ? (
                    <button
                      disabled
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-950/80 border border-zinc-850 text-zinc-500 text-xs font-bold py-2 cursor-not-allowed"
                    >
                      Request Sent
                    </button>
                  ) : conn?.status === 'pending_two_to_one' ? (
                    <button
                      onClick={() => handleConnect(item.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 shadow transition-all duration-150 active:scale-[0.98]"
                    >
                      Accept Request
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(item.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 transition-all duration-150 active:scale-[0.98] shadow-sm shadow-indigo-600/10"
                    >
                      Send Request
                    </button>
                  )}

                  {/* 2. Wave Action */}
                  <button
                    onClick={() => handleWave(item.id)}
                    disabled={isWaving}
                    className={`flex items-center justify-center px-3.5 rounded-xl border text-xs font-semibold tracking-wide transition-all duration-150 active:scale-[0.98] ${
                      isWaving
                        ? 'bg-zinc-800 border-zinc-750 text-indigo-400 scale-105'
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                    title="Send a simple waving hand to say hi!"
                  >
                    <Hand className={`h-3.5 w-3.5 ${isWaving ? 'animate-bounce' : ''}`} />
                  </button>

                  {/* 3. Follow Action */}
                  <button
                    onClick={() => handleFollow(item.id)}
                    className={`flex items-center justify-center px-3.5 rounded-xl border text-xs font-semibold tracking-wide transition-all duration-150 active:scale-[0.98] ${
                      isFollowing
                        ? 'bg-pink-500/10 border-pink-500/20 text-pink-400'
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                    title="Follow to see their active watchlist updates in your activity feed!"
                  >
                    <Bookmark className={`h-3.5 w-3.5 ${isFollowing ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
