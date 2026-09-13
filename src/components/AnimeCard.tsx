import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Star, Plus, Check, ChevronDown, Calendar, Film, Tv, Compass } from 'lucide-react';
import { Anime } from '../types';
import { useHydratedAnime, isPlaceholder } from '../utils/animeCache';

interface AnimeCardProps {
  key?: React.Key;
  anime: Anime;
  onClick: () => void;
  recommendationReason?: string;
  onAddToWatchList?: (e: React.MouseEvent, anime: Anime, status: 'want_to_watch' | 'watching' | 'completed') => void;
  onRemoveFromWatchList?: (e: React.MouseEvent, animeId: number) => void;
  currentStatus?: 'want_to_watch' | 'plan_to_watch' | 'watching' | 'completed' | 'dropped' | 'on_hold';
}

export default function AnimeCard({ 
  anime: propAnime, 
  onClick, 
  recommendationReason, 
  onAddToWatchList, 
  onRemoveFromWatchList,
  currentStatus 
}: AnimeCardProps) {
  const { anime, isHydrating } = useHydratedAnime(propAnime);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Do not render anime cards until metadata has been fully hydrated (return a skeleton loading state instead)
  if (isHydrating || !anime) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-zinc-900/60 border border-zinc-800/50 flex flex-col h-[420px] animate-pulse">
        {/* Shimmer image */}
        <div className="relative aspect-[3/4.2] bg-zinc-800/20" />
        {/* Shimmer info */}
        <div className="p-3.5 space-y-3 flex-grow bg-zinc-900/20">
          <div className="h-4 bg-zinc-800/40 rounded w-3/4" />
          <div className="h-3 bg-zinc-800/30 rounded w-1/2" />
          <div className="space-y-1.5 pt-2">
            <div className="h-2.5 bg-zinc-800/20 rounded w-full" />
            <div className="h-2.5 bg-zinc-800/20 rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  // Determine score badge color
  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 7.5) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
  };

  // Format seasonal string nicely
  const formatSeasonStr = (season?: string, year?: number) => {
    if (!season) return year ? `${year}` : '';
    const s = season.charAt(0).toUpperCase() + season.slice(1).toLowerCase();
    return year ? `${s} ${year}` : s;
  };

  // Clean status string mapping
  const formatStatus = (statusStr: string) => {
    if (!statusStr || isPlaceholder(statusStr)) return '';
    const s = statusStr.toLowerCase();
    if (s.includes('finished') || s.includes('completed')) return 'Completed';
    if (s.includes('currently') || s.includes('airing') || s.includes('releasing')) return 'Airing';
    if (s.includes('not yet') || s.includes('upcoming')) return 'Upcoming';
    return statusStr.charAt(0).toUpperCase() + statusStr.slice(1).toLowerCase();
  };

  const getStatusLabel = (status: 'want_to_watch' | 'plan_to_watch' | 'watching' | 'completed' | 'dropped' | 'on_hold') => {
    switch (status) {
      case 'want_to_watch':
      case 'plan_to_watch': return 'Plan to Watch';
      case 'watching': return 'Watching';
      case 'completed': return 'Completed';
      case 'dropped': return 'Dropped';
      case 'on_hold': return 'On Hold';
      default: return 'Plan to Watch';
    }
  };

  const hasScore = anime.score && anime.score > 0;
  const hasYear = anime.year && anime.year > 0;
  const hasStudio = anime.studio && !isPlaceholder(anime.studio);
  const hasSynopsis = anime.synopsis && !isPlaceholder(anime.synopsis);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      id={`anime-card-${anime.mal_id}`}
      className="group relative cursor-pointer overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 hover:shadow-xl hover:shadow-indigo-950/10 transition-all duration-300 flex flex-col h-full"
    >
      {/* Anime Cover Image Wrapper */}
      <div className="relative aspect-[3/4.2] overflow-hidden bg-zinc-950">
        <img
          src={anime.image}
          alt={anime.english_title || anime.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
        
        {/* Dark vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent opacity-90" />

        {/* Floating Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {/* Format Badge */}
          <span className="self-start rounded bg-zinc-950/85 text-zinc-300 border border-zinc-800 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 backdrop-blur-sm">
            {anime.type === 'Movie' ? 'Movie' : anime.type}
          </span>

          {/* Watch Status Badge */}
          {currentStatus && (
            <span className="self-start rounded bg-indigo-600/90 text-white text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 backdrop-blur-sm shadow-sm flex items-center gap-1 border border-indigo-500/20">
              <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
              {getStatusLabel(currentStatus)}
            </span>
          )}
        </div>

        {/* Rating Star Badge (Only render if hasScore is true) */}
        {hasScore && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <div className={`flex items-center gap-1 rounded bg-zinc-950/85 px-2 py-0.5 text-[10px] font-bold border backdrop-blur-sm ${getScoreColor(anime.score)}`}>
              <Star className="h-3 w-3 fill-current text-amber-500 shrink-0" />
              {anime.score.toFixed(1)}
            </div>
          </div>
        )}

        {/* Quick Add / Status Change Trigger */}
        {onAddToWatchList && (
          <div className="absolute right-2.5 bottom-2.5 translate-y-0 md:translate-y-2 opacity-100 md:opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className={`flex h-8 items-center gap-1 px-2.5 rounded-lg border transition-all duration-200 text-xs font-semibold shadow-md ${
                currentStatus 
                  ? 'bg-indigo-600 text-white border-indigo-500/40 hover:bg-indigo-700' 
                  : 'bg-zinc-900/90 text-zinc-200 border-zinc-700/50 hover:bg-indigo-600 hover:text-white hover:border-indigo-500/30'
              }`}
            >
              {currentStatus ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <ChevronDown className="h-3 w-3 opacity-85" />
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Custom Watch Status Dropdown List */}
        {isMenuOpen && (
          <div 
            ref={menuRef}
            className="absolute right-2.5 bottom-12 z-30 w-36 rounded-xl border border-zinc-800 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[9px] font-bold text-zinc-500 px-2 py-1 uppercase tracking-wider">Set Status</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToWatchList?.(e, anime, 'want_to_watch');
                setIsMenuOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 text-[11px] rounded-lg font-semibold transition-colors ${
                currentStatus === 'want_to_watch'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              Plan to Watch
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToWatchList?.(e, anime, 'watching');
                setIsMenuOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 text-[11px] rounded-lg font-semibold transition-colors ${
                currentStatus === 'watching'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              Watching
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToWatchList?.(e, anime, 'completed');
                setIsMenuOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 text-[11px] rounded-lg font-semibold transition-colors ${
                currentStatus === 'completed'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              Completed
            </button>
            {currentStatus && onRemoveFromWatchList && (
              <div className="border-t border-zinc-800/60 my-1 pt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFromWatchList(e, anime.mal_id);
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-[11px] text-red-400 hover:bg-red-500/10 rounded-lg font-semibold transition-colors"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Details Footer */}
      <div className="p-3.5 flex flex-col flex-grow justify-between bg-zinc-900/20">
        <div className="space-y-2">
          {/* Main Title & Native Title */}
          <div>
            <h3 className="line-clamp-1 font-display font-bold text-xs sm:text-sm text-zinc-100 group-hover:text-indigo-400 transition-colors duration-200" title={anime.english_title || anime.title}>
              {anime.english_title || anime.title}
            </h3>

            {/* Native Title Display when available */}
            {anime.native_title && !isPlaceholder(anime.native_title) && (
              <p className="text-[10px] text-zinc-500 font-mono line-clamp-1 truncate mt-0.5" title={anime.native_title}>
                {anime.native_title}
              </p>
            )}
            
            {/* Metadata row with season, episodes, and status */}
            <div className="flex items-center flex-wrap gap-1 mt-1 text-[10px] text-zinc-500 font-medium">
              <span>{formatSeasonStr(anime.season, anime.year) || 'N/A'}</span>
              <span>•</span>
              <span>{anime.episodes ? `${anime.episodes} eps` : 'Ongoing'}</span>
              {anime.status && !isPlaceholder(anime.status) && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[85px]">{formatStatus(anime.status)}</span>
                </>
              )}
            </div>
          </div>

          {/* Short Truncated Synopsis */}
          {hasSynopsis && (
            <p className="text-[11px] leading-relaxed text-zinc-400/90 line-clamp-2 select-none">
              {anime.synopsis.replace(/\[Written by MAL Rewrite\]|\[Source:.*?\]/g, '').trim()}
            </p>
          )}
        </div>

        {/* Studio + Genres Row */}
        <div className="mt-3 pt-3.5 border-t border-zinc-800/50 flex flex-col gap-2.5">
          {/* Studio Name */}
          {hasStudio && (
            <div className="flex items-center justify-between text-[10px] font-medium text-zinc-500">
              <span className="text-zinc-500">Studio</span>
              <span className="text-zinc-300 font-bold truncate max-w-[110px]" title={anime.studio}>
                {anime.studio}
              </span>
            </div>
          )}

          {/* Genres pills */}
          {anime.genres && anime.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {anime.genres.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="rounded bg-zinc-950 px-1.5 py-0.5 text-[9px] text-zinc-400 border border-zinc-800/80 font-medium"
                >
                  {genre}
                </span>
              ))}
              {anime.genres.length > 2 && (
                <span className="text-[9px] text-zinc-500 self-center pl-0.5">
                  +{anime.genres.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Recommendation subtle reason if provided */}
          {recommendationReason && (
            <div className="mt-1 pt-2 border-t border-zinc-800/30 flex items-center gap-1.5 text-[10px] text-zinc-300 font-semibold bg-indigo-950/20 px-2 py-1 rounded border border-indigo-550/15">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="truncate">{recommendationReason}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
