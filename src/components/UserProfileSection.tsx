import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Film, Bookmark, CheckCircle2, ChevronRight, Settings2, LogOut, Check, Heart, Eye, AlertCircle, Award } from 'lucide-react';
import { User, Anime, WatchListEntry, FavoriteAnimeMeta, FavoriteStudioMeta } from '../types';
import { getCachedAnime } from '../utils/animeCache';
import { AvatarDisplay } from './AuthModal';
import { countries, languages } from '../utils/geography';
import SearchableSelect from './SearchableSelect';
import LiveAnimeSearchAutocomplete from './LiveAnimeSearchAutocomplete';
import LiveStudioSearchAutocomplete from './LiveStudioSearchAutocomplete';
import LiveGenreSearchAutocomplete from './LiveGenreSearchAutocomplete';

interface UserProfileSectionProps {
  user: User;
  watchList: WatchListEntry[];
  animeList: Anime[];
  onUpdateUser: (updatedUser: User) => void;
  onLogout: () => void;
  onSelectAnime: (anime: Anime) => void;
}

const PREMIUM_AVATARS = [
  { id: 'naruto', name: 'Shinobi', color: 'from-orange-500 to-amber-600', emoji: '🥷' },
  { id: 'cyber', name: 'Cyberpunk', color: 'from-fuchsia-500 to-pink-600', emoji: '🦾' },
  { id: 'mecha', name: 'Pilot', color: 'from-blue-500 to-cyan-600', emoji: '🤖' },
  { id: 'sorcerer', name: 'Sorcerer', color: 'from-violet-600 to-indigo-700', emoji: '🔮' },
  { id: 'otaku', name: 'Chibi', color: 'from-emerald-500 to-teal-600', emoji: '🍙' },
  { id: 'samurai', name: 'Ronin', color: 'from-red-500 to-rose-600', emoji: '⚔️' }
];

export default function UserProfileSection({ 
  user, 
  watchList, 
  animeList, 
  onUpdateUser, 
  onLogout, 
  onSelectAnime 
}: UserProfileSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'settings'>('profile');
  const [editUsername, setEditUsername] = useState(user.username);
  const [editAvatar, setEditAvatar] = useState(user.avatar);
  const [editBio, setEditBio] = useState(user.bio || '');
  const [editGenres, setEditGenres] = useState<string[]>(user.favoriteGenres);
  const [editCountry, setEditCountry] = useState(user.country || '');
  const [editLanguage, setEditLanguage] = useState(user.language || '');
  const [editDisplayName, setEditDisplayName] = useState(user.displayName || '');
  const [editFavoriteAnime, setEditFavoriteAnime] = useState<string | FavoriteAnimeMeta>(user.favoriteAnime || '');
  const [editFavoriteStudio, setEditFavoriteStudio] = useState<string | FavoriteStudioMeta>(user.favoriteStudio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Stats calculation
  const totalSaved = watchList.length;
  const completingCount = watchList.filter(e => e.status === 'completed').length;
  const watchingCount = watchList.filter(e => e.status === 'watching').length;
  const wantToWatchCount = watchList.filter(e => e.status === 'plan_to_watch' || e.status === 'want_to_watch' as any).length;

  // Map recently viewed mal_ids to Anime objects
  const recentlyViewed = user.recentlyViewedIds
    ? user.recentlyViewedIds
        .map(id => animeList.find(a => a.mal_id === id))
        .filter((a): a is Anime => !!a)
        .slice(0, 5)
    : [];

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          username: editUsername.trim() || user.username,
          displayName: editDisplayName.trim() || undefined,
          avatar: editAvatar,
          bio: editBio.trim(),
          favoriteGenres: editGenres,
          country: editCountry.trim(),
          language: editLanguage.trim(),
          favoriteAnime: typeof editFavoriteAnime === 'string' ? editFavoriteAnime.trim() : editFavoriteAnime,
          favoriteStudio: typeof editFavoriteStudio === 'string' ? editFavoriteStudio.trim() : editFavoriteStudio
        })
      });

      if (res.ok) {
        const updated = await res.json();
        onUpdateUser(updated);
        localStorage.setItem('animatch_active_session', JSON.stringify(updated));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Error saving user update to server:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const joinedDateString = new Date(user.joinedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto" id="profile-section-root">
      
      {(!user.country || !user.language) && (
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 bg-indigo-500/10 border border-indigo-500/20 px-5 py-4 rounded-3xl text-xs text-indigo-300 animate-fade-in shadow-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-indigo-400" />
            <div>
              <p className="font-bold text-zinc-100">Help Us Personalize Your Experience</p>
              <p className="text-zinc-400 mt-0.5">Please select your country and primary language to connect with local fans and customize your experience.</p>
            </div>
          </div>
          <button
            onClick={() => setActiveSubTab('settings')}
            className="w-full sm:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 text-[11px] transition-all cursor-pointer shadow-md shadow-indigo-950/20"
          >
            Complete Profile
          </button>
        </div>
      )}
      
      {/* Top Banner & Header info */}
      <div className="relative overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 p-6 sm:p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
        
        {/* Large Avatar Display */}
        <div className="relative shrink-0">
          <AvatarDisplay id={user.avatar} className="h-20 w-20 sm:h-24 sm:w-24 text-3xl sm:text-4xl shadow-xl shadow-zinc-950/40" />
        </div>

        {/* User context information */}
        <div className="flex-1 text-center md:text-left space-y-3">
          <div>
            <h2 className="text-2xl font-display font-bold text-white tracking-tight flex flex-col sm:flex-row items-center gap-2">
              <span>{user.displayName || user.username}</span>
              <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full tracking-wider mt-1 sm:mt-0 font-bold animate-pulse">
                Premium Collector
              </span>
            </h2>
            {user.displayName && (
              <p className="text-[11px] text-indigo-400 font-mono font-medium">@{user.username}</p>
            )}
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{user.email}</p>
          </div>

          {/* User Bio */}
          <p className="text-xs text-zinc-300 max-w-xl leading-relaxed">
            {user.bio || "No custom bio configured. Edit your profile to share your anime preferences with other fans!"}
          </p>

          {/* Badges / Achievements */}
          <div className="flex flex-wrap justify-center md:justify-start gap-1.5 pt-1">
            {(user.badges || ["Taste Pioneer", "Series Completionist", "Community Anchor"]).map(badge => (
              <span key={badge} className="text-[9px] font-bold px-2 py-0.5 rounded bg-zinc-950 text-indigo-400 border border-indigo-500/15 uppercase tracking-wider font-mono">
                🎖️ {badge}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-xs text-zinc-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-zinc-500" />
              Joined {joinedDateString}
            </span>
            {user.country ? (
              <span className="flex items-center gap-1.5 bg-zinc-950/40 px-2.5 py-0.5 rounded-full text-[10px] text-zinc-400 border border-zinc-850 animate-fade-in">
                {countries.find(c => c.name === user.country)?.flag || '📍'} {user.country} • 🗣️ {user.language || 'English'}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-0.5 rounded-full text-[10px] text-indigo-350 animate-pulse">
                📍 Profile Incomplete
              </span>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 max-w-xl">
            <div className="bg-zinc-950/40 border border-zinc-850 p-3 rounded-2xl text-center">
              <p className="text-lg font-bold text-white leading-none">{totalSaved}</p>
              <p className="text-[9px] font-bold text-zinc-500 uppercase mt-1">Total Saved</p>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-850 p-3 rounded-2xl text-center">
              <p className="text-lg font-bold text-indigo-450 leading-none">{watchingCount}</p>
              <p className="text-[9px] font-bold text-zinc-500 uppercase mt-1">Watching</p>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-850 p-3 rounded-2xl text-center">
              <p className="text-lg font-bold text-emerald-400 leading-none">{completingCount}</p>
              <p className="text-[9px] font-bold text-zinc-500 uppercase mt-1">Completed</p>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-850 p-3 rounded-2xl text-center">
              <p className="text-lg font-bold text-zinc-400 leading-none">{wantToWatchCount}</p>
              <p className="text-[9px] font-bold text-zinc-500 uppercase mt-1">Plan to Watch</p>
            </div>
          </div>
        </div>

        {/* Action button triggers */}
        <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab(activeSubTab === 'profile' ? 'settings' : 'profile')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeSubTab === 'settings'
                ? 'bg-indigo-600 text-white border-indigo-500/20 shadow-md shadow-indigo-950/10'
                : 'bg-zinc-950/40 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850'
            }`}
          >
            <Settings2 className="h-4 w-4" />
            {activeSubTab === 'settings' ? 'View Dashboard' : 'Edit Profile'}
          </button>

          <button
            onClick={onLogout}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-zinc-950/40 hover:bg-indigo-500/10 text-zinc-400 hover:text-indigo-400 border border-zinc-800 hover:border-indigo-500/20 px-4 py-2.5 text-xs font-semibold tracking-wide transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'profile' ? (
          <motion.div
            key="profile-details"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid md:grid-cols-3 gap-8"
          >
            {/* Left side: favorite genres */}
            <div className="md:col-span-1 space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-indigo-450 fill-current" />
                  Your Favorite Genres
                </h3>
                {user.favoriteGenres && user.favoriteGenres.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {user.favoriteGenres.map(genre => (
                      <span
                        key={genre}
                        className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 font-medium animate-fade-in"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 leading-relaxed italic animate-fade-in">No genres selected yet. Edit your profile to save favorites and improve recommendation matches.</p>
                )}
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-indigo-400" />
                  All-Time Favorites
                </h3>
                <div className="space-y-3.5">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Favorite Anime</p>
                    {user.favoriteAnime ? (
                      (() => {
                        const isAnimeObj = typeof user.favoriteAnime === 'object' && user.favoriteAnime !== null && 'title' in user.favoriteAnime;
                        if (isAnimeObj) {
                          const fav = user.favoriteAnime as FavoriteAnimeMeta;
                          return (
                            <div className="flex items-center gap-3 bg-zinc-950/50 p-2 rounded-xl border border-zinc-850 animate-fade-in">
                              {fav.poster ? (
                                <img
                                  src={fav.poster}
                                  alt={fav.title}
                                  className="w-10 h-14 object-cover rounded shadow border border-zinc-800 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-14 bg-zinc-950 border border-zinc-850 rounded flex items-center justify-center shrink-0">
                                  <Film className="h-5 w-5 text-zinc-600" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-zinc-150 truncate leading-snug">
                                  {fav.title}
                                </p>
                                <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                                  {fav.mediaType} • {fav.year || 'N/A'}
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return <p className="text-xs font-semibold text-zinc-200 animate-fade-in">{user.favoriteAnime as string}</p>;
                      })()
                    ) : (
                      <p className="text-xs text-zinc-500 italic animate-fade-in">Not specified yet</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Favorite Studio</p>
                    {user.favoriteStudio ? (
                      (() => {
                        const isStudioObj = typeof user.favoriteStudio === 'object' && user.favoriteStudio !== null && 'studioName' in user.favoriteStudio;
                        if (isStudioObj) {
                          const fav = user.favoriteStudio as FavoriteStudioMeta;
                          return (
                            <div className="flex items-center gap-2.5 bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-850 animate-fade-in">
                              <div className="w-8 h-8 bg-zinc-900 border border-zinc-850 rounded-lg flex items-center justify-center shrink-0">
                                <Award className="h-4 w-4 text-indigo-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-zinc-150 truncate leading-snug">
                                  {fav.studioName}
                                </p>
                                <p className="text-[10px] font-mono text-zinc-500 mt-0.5">Animation Studio</p>
                              </div>
                            </div>
                          );
                        }
                        return <p className="text-xs font-semibold text-zinc-200 animate-fade-in">{user.favoriteStudio as string}</p>;
                      })()
                    ) : (
                      <p className="text-xs text-zinc-500 italic animate-fade-in">Not specified yet</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Match Profile</h3>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Your personalized matchmaking profile is active. Our system analyzes your watchlist and genre preferences to suggest high-compatibility anime matches from our catalog.
                </p>
              </div>
            </div>

            {/* Right side: recently viewed and watchlist summaries */}
            <div className="md:col-span-2 space-y-6">
              {/* Recently Viewed */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-zinc-400" />
                  Recently Reviewed Titles
                </h3>
                
                {recentlyViewed.length > 0 ? (
                  <div className="space-y-2 animate-fade-in">
                    {recentlyViewed.map(anime => {
                      const resolvedAnime = getCachedAnime(anime.mal_id) || anime;
                      return (
                        <div
                          key={resolvedAnime.mal_id}
                          onClick={() => onSelectAnime(resolvedAnime)}
                          className="group flex items-center gap-3 bg-zinc-950/45 border border-zinc-850 hover:border-zinc-700/60 p-2.5 rounded-xl cursor-pointer transition-all duration-150"
                        >
                          <img
                            src={resolvedAnime.image}
                            alt={resolvedAnime.english_title || resolvedAnime.title}
                            className="h-11 w-8 rounded object-cover bg-zinc-900 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-400 transition-colors truncate">
                              {resolvedAnime.english_title || resolvedAnime.title}
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                              {resolvedAnime.genres.slice(0, 3).join(', ')} • {resolvedAnime.studio || 'N/A'}
                            </p>
                          </div>
                          <span className="shrink-0 text-[10px] font-bold text-amber-400 bg-amber-400/5 px-2 py-1 rounded border border-amber-400/10">
                            ★ {resolvedAnime.score.toFixed(1)}
                          </span>
                          <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-zinc-800 rounded-xl animate-fade-in">
                    <p className="text-xs text-zinc-500 italic">No recently viewed items recorded. Browse shows to trigger logs.</p>
                  </div>
                )}
              </div>

              {/* Active Watch board previews */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Film className="h-4 w-4 text-zinc-400" />
                  Currently Watching List
                </h3>

                {watchList.filter(e => e.status === 'watching').length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3 animate-fade-in">
                    {watchList.filter(e => e.status === 'watching').slice(0, 4).map(entry => {
                      const resolvedAnime = getCachedAnime(entry.anime.mal_id) || entry.anime;
                      return (
                        <div
                          key={resolvedAnime.mal_id}
                          onClick={() => onSelectAnime(resolvedAnime)}
                          className="group flex items-center gap-2.5 bg-zinc-950/40 hover:bg-zinc-850 border border-zinc-850 p-2.5 rounded-xl cursor-pointer transition-colors"
                        >
                          <img
                            src={resolvedAnime.image}
                            alt={resolvedAnime.english_title || resolvedAnime.title}
                            className="h-10 w-7 rounded object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-indigo-400 transition-colors">
                              {resolvedAnime.english_title || resolvedAnime.title}
                            </p>
                            <span className="inline-block mt-1 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {entry.priority} priority
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-zinc-800 rounded-xl animate-fade-in">
                    <p className="text-xs text-zinc-500 italic">No shows are currently flagged as "Watching". Navigate to Watch Board to update lane entries.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="profile-settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-2xl mx-auto animate-fade-in"
          >
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  <Settings2 className="h-4.5 w-4.5 text-zinc-400" />
                  Account Settings
                </h3>
                <p className="text-xs text-zinc-500 mt-1">Manage username, select avatar identity, and configure discovery genre bias.</p>
              </div>

              {saveSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>Settings successfully saved and synced!</span>
                </div>
              )}

              {/* Username & Display Name Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Username</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value.replace(/\s+/g, ''))}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-850 focus:border-indigo-500/40 py-2.5 px-4 text-xs text-zinc-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Display Name</label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="Your display nickname..."
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-850 focus:border-indigo-500/40 py-2.5 px-4 text-xs text-zinc-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                  />
                </div>
              </div>

              {/* Bio Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Profile Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={160}
                  placeholder="Share your anime philosophy, favorite studios, or seasonal streaming times..."
                  className="w-full h-20 rounded-xl bg-zinc-950 border border-zinc-850 focus:border-indigo-500/40 py-2.5 px-4 text-xs text-zinc-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"
                />
              </div>

              {/* Country & Language Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Country</label>
                  <SearchableSelect
                    options={countries.map(c => ({ label: c.name, value: c.name, extra: c.flag }))}
                    value={editCountry}
                    onChange={(val) => setEditCountry(val)}
                    placeholder="Select country..."
                    searchPlaceholder="Search country..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Primary Language</label>
                  <SearchableSelect
                    options={languages.map(l => ({ label: l.name, value: l.name, extra: '🗣️' }))}
                    value={editLanguage}
                    onChange={(val) => setEditLanguage(val)}
                    placeholder="Select language..."
                    searchPlaceholder="Search language..."
                  />
                </div>
              </div>

              {/* All-Time Favorites Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="all-time-favorites-rebuilt">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">All-Time Favorite Anime</label>
                  <LiveAnimeSearchAutocomplete
                    value={editFavoriteAnime}
                    onChange={(val) => setEditFavoriteAnime(val)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Favorite Animation Studio</label>
                  <LiveStudioSearchAutocomplete
                    value={editFavoriteStudio}
                    onChange={(val) => setEditFavoriteStudio(val)}
                  />
                </div>
              </div>

              {/* Avatar Switcher */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Avatar Character</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PREMIUM_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setEditAvatar(av.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                        editAvatar === av.id
                          ? 'bg-zinc-850 border-indigo-500 text-white shadow-md'
                          : 'bg-zinc-950/40 border-zinc-850 text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-full bg-gradient-to-tr ${av.color} flex items-center justify-center text-sm shadow`}>
                        {av.emoji}
                      </div>
                      <span className="text-[8px] font-bold mt-1 text-zinc-400 truncate w-full text-center">{av.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Genre Selector */}
              <LiveGenreSearchAutocomplete
                selected={editGenres}
                onChange={(newSelected) => setEditGenres(newSelected)}
              />

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditUsername(user.username);
                    setEditAvatar(user.avatar);
                    setEditBio(user.bio || '');
                    setEditGenres(user.favoriteGenres);
                    setActiveSubTab('profile');
                  }}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs px-5 py-2.5 cursor-pointer transition-all flex items-center gap-1.5 shadow"
                >
                  {isSaving ? (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-zinc-400 border-t-zinc-950 animate-spin" />
                  ) : (
                    <>
                      Save Changes
                      <Check className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
