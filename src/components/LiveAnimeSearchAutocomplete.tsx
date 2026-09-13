import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Sparkles, X, Check, Keyboard, Calendar, Film } from 'lucide-react';
import { FavoriteAnimeMeta, Anime } from '../types';
import { searchOnlineAnime, getAnimeSearchScore, rankAnimeList, escapeRegExp } from '../utils/liveAnimeProvider';
import localAnimeData from '../data/anime_data.json';

interface LiveAnimeSearchAutocompleteProps {
  value?: string | FavoriteAnimeMeta;
  onChange: (value: FavoriteAnimeMeta) => void;
  placeholder?: string;
}

// Memory cache for active searches to ensure instantaneous results on backspace/repeated terms
const localSearchCache = new Map<string, Anime[]>();

export default function LiveAnimeSearchAutocomplete({
  value,
  onChange,
  placeholder = 'Search and select any anime...'
}: LiveAnimeSearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Determine current display label/poster
  const isStructured = value && typeof value === 'object' && 'title' in value;
  const currentTitle = isStructured ? (value as FavoriteAnimeMeta).title : (value as string || '');
  const currentPoster = isStructured ? (value as FavoriteAnimeMeta).poster : '';

  // Handle outside clicks
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced API searching with instant local feedback
  useEffect(() => {
    if (!isOpen) return;

    // Show top popular recommendations if search query is empty
    if (searchQuery.trim() === '') {
      setIsLoading(true);
      const cached = localSearchCache.get('__POPULAR__');
      if (cached) {
        setResults(cached);
        setIsLoading(false);
      } else {
        searchOnlineAnime('', [], 'All', 0, 'popularity', 15, 0)
          .then(res => {
            setResults(res.data);
            localSearchCache.set('__POPULAR__', res.data);
          })
          .catch(err => console.error('[Autocomplete] Empty query load failed:', err))
          .finally(() => setIsLoading(false));
      }
      return;
    }

    const q = searchQuery.trim();
    const cacheKey = q.toLowerCase();

    // 1. Instant local search feedback: filter local data and show matching results immediately
    const localMatches = (localAnimeData as any[]).map(item => ({
      ...item,
      synonyms: item.synonyms || []
    }) as Anime).filter(anime => getAnimeSearchScore(anime, q) > 0);

    const rankedLocal = rankAnimeList(localMatches, q);
    if (rankedLocal.length > 0) {
      setResults(rankedLocal);
    }

    // 2. Query the live API in the background with a tight 250ms debounce
    const delayDebounce = setTimeout(() => {
      const cached = localSearchCache.get(cacheKey);

      if (cached) {
        setResults(cached);
        return;
      }

      setIsLoading(true);
      searchOnlineAnime(searchQuery, [], 'All', 0, 'popularity', 25, 0)
        .then(res => {
          setResults(res.data);
          localSearchCache.set(cacheKey, res.data);
        })
        .catch(err => console.error('[Autocomplete] Live search failed:', err))
        .finally(() => setIsLoading(false));
    }, 250); // 250ms debounce for lightning responsiveness

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % (results.length || 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + results.length) % (results.length || 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < results.length) {
          handleSelect(results[focusedIndex]);
        } else if (results.length > 0) {
          handleSelect(results[0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (anime: Anime) => {
    onChange({
      animeId: anime.mal_id,
      title: anime.english_title || anime.title,
      poster: anime.image,
      mediaType: anime.type || anime.format || 'TV',
      year: anime.year || 0
    });
    setIsOpen(false);
    setSearchQuery('');
  };

  // Keep focused element in view
  useEffect(() => {
    if (focusedIndex >= 0 && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector(`[data-index="${focusedIndex}"]`) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  return (
    <div className="relative w-full" ref={containerRef} id="favorite-anime-autocomplete">
      {/* Selection Box / Input Trigger */}
      <div 
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={`w-full flex items-center justify-between rounded-xl bg-zinc-950 border transition-all cursor-pointer p-2.5 ${
          isOpen ? 'border-indigo-500/55 ring-4 ring-indigo-500/5' : 'border-zinc-850 hover:border-zinc-750'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {currentPoster ? (
            <img 
              src={currentPoster} 
              alt={currentTitle} 
              className="w-8 h-11 object-cover rounded-md shrink-0 shadow bg-zinc-900 border border-zinc-800" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-11 bg-zinc-900 border border-zinc-850 rounded-md flex items-center justify-center shrink-0">
              <Film className="h-4.5 w-4.5 text-zinc-600" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {currentTitle ? (
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-zinc-150 truncate leading-snug">{currentTitle}</p>
                {isStructured && (
                  <p className="text-[10px] font-mono font-medium text-indigo-400/85 flex items-center gap-1">
                    <span>{(value as FavoriteAnimeMeta).mediaType}</span>
                    <span>•</span>
                    <span>{(value as FavoriteAnimeMeta).year || 'N/A'}</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-650 font-medium">{placeholder}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 pr-1.5 shrink-0">
          {currentTitle && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ animeId: 0, title: '', poster: '', mediaType: 'TV', year: 0 });
                setSearchQuery('');
              }}
              className="text-zinc-600 hover:text-zinc-350 p-1 rounded-md hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <Search className="h-4 w-4 text-zinc-550" />
        </div>
      </div>

      {/* Dropdown Floating Panel */}
      {isOpen && (
        <div 
          className="absolute z-50 mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[350px] animate-fade-in"
          id="favorite-anime-dropdown-panel"
        >
          {/* Active Search Input inside dropdown */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-900/90 bg-zinc-950 sticky top-0 z-10 shrink-0">
            <Search className="h-4 w-4 text-zinc-500 shrink-0 animate-pulse" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFocusedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type to search live catalog (e.g. Attack on Titan)..."
              className="w-full bg-transparent text-xs text-zinc-150 placeholder-zinc-600 focus:outline-none"
            />
            {isLoading ? (
              <Loader2 className="h-4 w-4 text-indigo-500 shrink-0 animate-spin" />
            ) : searchQuery ? (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-zinc-600 hover:text-zinc-400 text-xs shrink-0 font-medium cursor-pointer"
              >
                Clear
              </button>
            ) : (
              <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-650 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-850">
                <Keyboard className="h-2.5 w-2.5" />
                <span>NAV</span>
              </div>
            )}
          </div>

          {/* Results Scroller */}
          <div 
            ref={dropdownRef}
            className="overflow-y-auto flex-1 divide-y divide-zinc-900/50 p-1"
          >
            {isLoading && results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
                <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">Searching live AniList...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="h-10 w-10 bg-zinc-900/40 border border-zinc-850 rounded-full flex items-center justify-center text-zinc-600 mb-2.5">
                  <Film className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-zinc-350">No anime matching "{searchQuery}"</p>
                <p className="text-[10px] text-zinc-550 mt-1">Try another keyword, romaji title, or checking the spelling.</p>
              </div>
            ) : (
              results.map((anime, idx) => {
                const isSelected = isStructured && (value as FavoriteAnimeMeta).animeId === anime.mal_id;
                const isFocused = focusedIndex === idx;

                return (
                  <button
                    key={anime.mal_id}
                    type="button"
                    data-index={idx}
                    onClick={() => handleSelect(anime)}
                    className={`w-full flex items-start gap-3.5 rounded-xl px-3 py-2.5 text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-655 bg-indigo-600/10 border border-indigo-500/20 text-white'
                        : isFocused
                        ? 'bg-zinc-900 text-zinc-150'
                        : 'text-zinc-400 hover:bg-zinc-900/55 hover:text-zinc-200'
                    }`}
                  >
                    <img 
                      src={anime.image} 
                      alt={anime.english_title || anime.title}
                      className="w-10 h-14 object-cover rounded shadow shrink-0 bg-zinc-900 border border-zinc-850" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs font-bold text-zinc-150 truncate leading-snug">
                        {anime.english_title || anime.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500 font-medium">
                        <span className="bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded text-[9px] font-mono text-indigo-400/80">
                          {anime.type || anime.format || 'TV'}
                        </span>
                        {anime.year > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Calendar className="h-3 w-3 shrink-0 text-zinc-650" />
                            {anime.year}
                          </span>
                        )}
                        {anime.score > 0 && (
                          <span className="text-yellow-500/90 font-bold">
                            ★ {anime.score.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-indigo-500/15 border border-indigo-500/35 flex items-center justify-center shrink-0 self-center">
                        <Check className="h-3 w-3 text-indigo-400" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
