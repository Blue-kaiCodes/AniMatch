import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Sparkles, X, Check, Keyboard, Award } from 'lucide-react';
import { FavoriteStudioMeta } from '../types';
import { searchOnlineStudios } from '../utils/liveAnimeProvider';

interface LiveStudioSearchAutocompleteProps {
  value?: string | FavoriteStudioMeta;
  onChange: (value: FavoriteStudioMeta) => void;
  placeholder?: string;
}

// Memory cache for studio queries to ensure snappy, robust user experience
const localStudioCache = new Map<string, Array<{ id: number; name: string }>>();

export default function LiveStudioSearchAutocomplete({
  value,
  onChange,
  placeholder = 'Search animation studio...'
}: LiveStudioSearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Parse structured studio info
  const isStructured = value && typeof value === 'object' && 'studioName' in value;
  const currentName = isStructured ? (value as FavoriteStudioMeta).studioName : (value as string || '');

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

  // Debounced search queries
  useEffect(() => {
    if (!isOpen) return;

    if (searchQuery.trim() === '') {
      setIsLoading(true);
      const cached = localStudioCache.get('__POPULAR_STUDIOS__');
      if (cached) {
        setResults(cached);
        setIsLoading(false);
      } else {
        searchOnlineStudios('')
          .then(res => {
            setResults(res);
            localStudioCache.set('__POPULAR_STUDIOS__', res);
          })
          .catch(err => console.error('[Studio Autocomplete] Empty query failed:', err))
          .finally(() => setIsLoading(false));
      }
      return;
    }

    const delayDebounce = setTimeout(() => {
      const cacheKey = searchQuery.trim().toLowerCase();
      const cached = localStudioCache.get(cacheKey);

      if (cached) {
        setResults(cached);
        return;
      }

      setIsLoading(true);
      searchOnlineStudios(searchQuery)
        .then(res => {
          setResults(res);
          localStudioCache.set(cacheKey, res);
        })
        .catch(err => console.error('[Studio Autocomplete] Live search failed:', err))
        .finally(() => setIsLoading(false));
    }, 400); // 400ms debounce

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

  const handleSelect = (studio: { id: number; name: string }) => {
    onChange({
      studioId: studio.id,
      studioName: studio.name
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
    <div className="relative w-full" ref={containerRef} id="favorite-studio-autocomplete">
      {/* Trigger selection box */}
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
          <div className="w-8 h-8 bg-zinc-900 border border-zinc-850 rounded-lg flex items-center justify-center shrink-0">
            <Award className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="min-w-0 flex-1">
            {currentName ? (
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-zinc-150 truncate leading-snug">{currentName}</p>
                <p className="text-[10px] font-mono font-medium text-zinc-500">Animation Studio</p>
              </div>
            ) : (
              <p className="text-xs text-zinc-650 font-medium">{placeholder}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 pr-1.5 shrink-0">
          {currentName && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ studioId: 0, studioName: '' });
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

      {/* Floating results panel */}
      {isOpen && (
        <div
          className="absolute z-50 mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[300px] animate-fade-in"
          id="favorite-studio-dropdown-panel"
        >
          {/* Active Search Field */}
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
              placeholder="Search studios (e.g. Kyoto Animation, ufotable)..."
              className="w-full bg-transparent text-xs text-zinc-150 placeholder-zinc-600 focus:outline-none"
            />
            {isLoading ? (
              <Loader2 className="h-4 w-4 text-indigo-500 shrink-0 animate-spin" />
            ) : searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="text-zinc-650 hover:text-zinc-400 text-xs shrink-0 font-medium cursor-pointer"
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

          {/* Results Scroller list */}
          <div
            ref={dropdownRef}
            className="overflow-y-auto flex-1 divide-y divide-zinc-900/40 p-1"
          >
            {isLoading && results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
                <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">Searching AniList studios...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="h-9 w-9 bg-zinc-900/40 border border-zinc-850 rounded-full flex items-center justify-center text-zinc-600 mb-2">
                  <Award className="h-4.5 w-4.5" />
                </div>
                <p className="text-xs font-bold text-zinc-350">No studios matching "{searchQuery}"</p>
                <p className="text-[10px] text-zinc-550 mt-1">Check the spelling or try searching popular animation companies.</p>
              </div>
            ) : (
              results.map((studio, idx) => {
                const isSelected = isStructured && (value as FavoriteStudioMeta).studioId === studio.id;
                const isFocused = focusedIndex === idx;

                return (
                  <button
                    key={studio.id}
                    type="button"
                    data-index={idx}
                    onClick={() => handleSelect(studio)}
                    className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-600/10 border border-indigo-500/25 text-white'
                        : isFocused
                        ? 'bg-zinc-900 text-zinc-150'
                        : 'text-zinc-400 hover:bg-zinc-900/55 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Award className="h-4 w-4 text-indigo-400/80 shrink-0" />
                      <span className="text-xs font-semibold text-zinc-150 truncate">{studio.name}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />}
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
