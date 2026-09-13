import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Compass, Loader2, AlertTriangle, Play, Star } from 'lucide-react';
import { Anime, WatchListEntry } from '../types';
import { getAnimeSearchScore, rankAnimeList, escapeRegExp } from '../utils/liveAnimeProvider';
import localAnimeData from '../data/anime_data.json';
import AnimeCard from './AnimeCard';

interface RecommendationSectionProps {
  animeList: Anime[];
  onSelectAnime: (anime: Anime) => void;
  onAddToWatchList: (e: React.MouseEvent, anime: Anime, status: 'want_to_watch' | 'watching' | 'completed') => void;
  onRemoveFromWatchList?: (e: React.MouseEvent, animeId: number) => void;
  watchList: WatchListEntry[];
}

// Generates a human-like, clean, and subtle reason why this recommendation is displayed
function getRecommendationReason(anchor: Anime, rec: Anime): string {
  // Same studio check
  if (anchor.studio && rec.studio && anchor.studio.trim().toLowerCase() === rec.studio.trim().toLowerCase()) {
    return `From the studio behind ${anchor.english_title || anchor.title}`;
  }
  
  // Overlapping genres check
  const commonGenres = anchor.genres.filter(g => rec.genres.includes(g));
  if (commonGenres.length > 0) {
    return `Similar ${commonGenres.slice(0, 2).join(' & ')} themes`;
  }
  
  // Same format check
  if (anchor.type === rec.type && rec.type !== 'Special') {
    return `Similar storytelling format (${rec.type})`;
  }

  // General fallback
  return `Based on your interest in ${anchor.english_title || anchor.title}`;
}

export default function RecommendationSection({ 
  animeList, 
  onSelectAnime, 
  onAddToWatchList, 
  onRemoveFromWatchList,
  watchList 
}: RecommendationSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Anime[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  
  // Recommendation States
  const [recommendations, setRecommendations] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const suggestionRef = useRef<HTMLDivElement>(null);

  // Close suggestions autocomplete on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Update autocomplete search suggestions with instant local feedback
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 1) {
      setSuggestions([]);
      setFocusedIndex(-1);
      return;
    }

    // 1. Instant local search feedback
    const localMatches = (localAnimeData as any[]).map(item => ({
      ...item,
      synonyms: item.synonyms || []
    }) as Anime).filter(anime => getAnimeSearchScore(anime, query) > 0);

    const rankedLocal = rankAnimeList(localMatches, query);
    if (rankedLocal.length > 0) {
      setSuggestions(rankedLocal.slice(0, 8));
    }

    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`/api/anime?search=${encodeURIComponent(query)}&limit=8`);
        if (res.ok) {
          const result = await res.json();
          setSuggestions(result.data || []);
        }
      } catch (err) {
        console.error('Error fetching search autocomplete:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
          handleSelectAnchor(suggestions[focusedIndex]);
        } else if (suggestions.length > 0) {
          handleSelectAnchor(suggestions[0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setSuggestions([]);
        setFocusedIndex(-1);
        break;
    }
  };

  // Handle selecting an anime to fetch content-based similarity suggestions
  const handleSelectAnchor = async (anime: Anime) => {
    setSelectedAnime(anime);
    setSearchQuery('');
    setSuggestions([]);
    setFocusedIndex(-1);
    setIsLoading(true);
    setHasError(false);

    try {
      const res = await fetch(`/api/recommend/${anime.mal_id}`);
      if (res.ok) {
        const result = await res.json();
        setRecommendations(result.recommendations || []);
      } else {
        setHasError(true);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto" id="recommendation-section-root">
      
      {/* Search Header Area */}
      <div className="text-center space-y-4 py-12 sm:py-20 max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-6xl font-display font-black tracking-tight text-white leading-tight">
          Find your next <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Anime obsession</span>
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl mx-auto">
          Search for any anime and instantly discover recommendations, similar titles, reviews, watchlists, and fellow fans.
        </p>

        {/* Big Search Input */}
        <div ref={suggestionRef} className="relative max-w-lg mx-auto pt-4">
          <div className="relative flex items-center h-12">
            <Search className="absolute left-4 h-5 w-5 text-zinc-500 group-focus-within:text-indigo-400 transition-colors pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search anime... (e.g. Bleach, Jujutsu Kaisen, Your Name)"
              aria-label="Search anime for suggestions"
              className="w-full h-full rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-indigo-500/50 pl-12 pr-12 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-xl flex items-center"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 text-xs text-zinc-500 hover:text-zinc-300 font-semibold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown suggestions */}
          <AnimatePresence>
            {(suggestions.length > 0 || (searchQuery.trim().length >= 1 && isSearching)) && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl p-2 shadow-2xl z-40 max-h-80 overflow-y-auto flex flex-col gap-1"
                id="recommendation-search-suggestions"
              >
                {isSearching && suggestions.length === 0 ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                    <span className="text-xs font-mono uppercase tracking-wider text-[10px]">Searching catalog...</span>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="py-6 px-4 text-center">
                    <p className="text-xs font-bold text-zinc-400">No results found for "{searchQuery}"</p>
                    <p className="text-[10px] text-zinc-600 mt-1">Try another title or checking your spelling.</p>
                  </div>
                ) : (
                  suggestions.map((item, idx) => {
                    const isFocused = focusedIndex === idx;
                    return (
                      <button
                        key={item.mal_id}
                        onClick={() => handleSelectAnchor(item)}
                        className={`w-full flex items-center gap-3.5 p-2 rounded-xl text-left transition-colors group ${
                          isFocused ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-900/55'
                        }`}
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="h-11 w-8.5 object-cover rounded shadow shrink-0 bg-zinc-950 border border-zinc-850"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold truncate leading-snug ${isFocused ? 'text-indigo-400' : 'text-zinc-200 group-hover:text-indigo-400 transition-colors'}`}>
                            {item.english_title || item.title}
                          </p>

                          <div className="flex items-center gap-2 mt-1 text-[10px] font-medium text-zinc-500">
                            <span className="bg-zinc-900 text-indigo-400/80 px-1.5 py-0.5 rounded text-[9px] font-mono border border-zinc-850">{item.type || 'TV'}</span>
                            {item.year > 0 && <span>• {item.year}</span>}
                            {item.score > 0 && <span className="text-yellow-500/90 font-bold">★ {item.score.toFixed(1)}</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Discovery Display Results Area */}
      <div className="space-y-6">
        
        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            <p className="text-xs text-zinc-500 font-medium animate-pulse">Finding perfect matches...</p>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 border border-zinc-800 bg-zinc-900/20 rounded-2xl p-6 max-w-md mx-auto">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <div className="space-y-1">
              <h3 className="text-zinc-300 font-semibold text-sm">No recommendations found</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">We couldn't find recommendation matches for this title. Please try searching for another anime.</p>
            </div>
            <button
              onClick={() => selectedAnime && handleSelectAnchor(selectedAnime)}
              className="px-4 py-2 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 text-xs font-semibold rounded-xl border border-zinc-700/50 cursor-pointer transition-all"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Success Results content */}
        {!isLoading && !hasError && selectedAnime && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Main Anchor Show Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/20 p-5 sm:p-6 shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
                {/* Cover poster */}
                <div className="md:col-span-1 flex justify-center">
                  <div className="h-44 w-32 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-lg shrink-0">
                    <img
                      src={selectedAnime.image}
                      alt={selectedAnime.english_title || selectedAnime.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                {/* Source information */}
                <div className="md:col-span-4 flex flex-col justify-center space-y-3.5">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
                      {selectedAnime.english_title || selectedAnime.title}
                    </h2>
                    
                    {/* Compact Metadata Grid */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-zinc-400 mt-2 font-sans select-none">
                      {selectedAnime.score ? (
                        <div className="flex items-center gap-1 font-bold text-amber-400 bg-amber-400/5 px-2 py-0.5 rounded border border-amber-400/10">
                          <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />
                          <span>{selectedAnime.score.toFixed(2)}</span>
                        </div>
                      ) : null}

                      {selectedAnime.format || selectedAnime.type ? (
                        <span className="bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded text-[11px] font-bold border border-indigo-500/15">
                          {selectedAnime.format || selectedAnime.type}
                        </span>
                      ) : null}

                      {selectedAnime.episodes ? (
                        <span className="text-zinc-300">• {selectedAnime.episodes} Ep{selectedAnime.episodes > 1 ? 's' : ''}</span>
                      ) : null}

                      {selectedAnime.duration ? (
                        <span className="text-zinc-300">• {selectedAnime.duration}</span>
                      ) : null}

                      {selectedAnime.year || selectedAnime.season ? (
                        <span className="capitalize text-zinc-300">
                          • {selectedAnime.season ? `${selectedAnime.season.toLowerCase()} ` : ''}{selectedAnime.year || ''}
                        </span>
                      ) : null}

                      {selectedAnime.status ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          selectedAnime.status.toLowerCase().includes('airing') || selectedAnime.status.toLowerCase().includes('releasing')
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : selectedAnime.status.toLowerCase().includes('upcoming') || selectedAnime.status.toLowerCase().includes('not_yet_released')
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-zinc-800/40 text-zinc-400 border border-zinc-700/30'
                        }`}>
                          {selectedAnime.status.replace(/_/g, ' ').toLowerCase()}
                        </span>
                      ) : null}

                      {selectedAnime.rating ? (
                        <span className="text-[10px] text-zinc-500 border border-zinc-800/80 px-1.5 py-0.5 rounded bg-zinc-950/20">
                          {selectedAnime.rating}
                        </span>
                      ) : null}
                    </div>

                    {/* Studio & Source Row */}
                    {(selectedAnime.studio && selectedAnime.studio !== 'Unknown Studio') || selectedAnime.source ? (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 mt-2">
                        {selectedAnime.studio && selectedAnime.studio !== 'Unknown Studio' ? (
                          <span>Studio: <strong className="text-zinc-300 font-medium">{selectedAnime.studio}</strong></span>
                        ) : null}
                        {selectedAnime.source ? (
                          <span>
                            {selectedAnime.studio && selectedAnime.studio !== 'Unknown Studio' ? '• ' : ''}
                            Source: <strong className="text-zinc-300 font-medium">{selectedAnime.source}</strong>
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Genres chips */}
                    {selectedAnime.genres && selectedAnime.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 select-none">
                        {selectedAnime.genres.slice(0, 8).map((genre) => (
                          <span
                            key={genre}
                            className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-zinc-950/40 border border-zinc-850 text-zinc-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-colors duration-150"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-zinc-400 mt-3.5 leading-relaxed">
                      {selectedAnime.synopsis}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid of Recommended titles */}
            <div className="space-y-4">
              <h3 className="font-display font-bold text-lg text-zinc-200 tracking-wide">
                Recommended for you
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                {recommendations.map((rec) => (
                  <div key={rec.mal_id} className="relative h-full flex flex-col">
                    <AnimeCard
                      anime={rec}
                      recommendationReason={getRecommendationReason(selectedAnime, rec)}
                      currentStatus={watchList.find(entry => entry.anime.mal_id === rec.mal_id)?.status}
                      onAddToWatchList={onAddToWatchList}
                      onRemoveFromWatchList={onRemoveFromWatchList}
                      onClick={() => onSelectAnime(rec)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty state: prompt to search */}
        {!isLoading && !selectedAnime && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-5 border border-dashed border-zinc-800 rounded-3xl max-w-xl mx-auto bg-zinc-900/10">
            <div className="h-14 w-14 rounded-full bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-400/90 shadow-inner">
              <Compass className="h-6 w-6 animate-pulse" />
            </div>
            <div className="space-y-1.5 px-6">
              <h3 className="text-sm font-semibold text-zinc-200">Start Your Discovery Journey</h3>
              <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
                Type any anime title in the search bar above. We will instantly retrieve details and list curated titles shared by other fans based on story, themes, and genres.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
