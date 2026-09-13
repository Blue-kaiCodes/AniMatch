import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X, Check, Keyboard, Heart, Plus } from 'lucide-react';
import { fetchOnlineGenresAndTags } from '../utils/liveAnimeProvider';

interface LiveGenreSearchAutocompleteProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function LiveGenreSearchAutocomplete({
  selected,
  onChange
}: LiveGenreSearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allGenres, setAllGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Load all available genres and tags on mount
  useEffect(() => {
    setIsLoading(true);
    fetchOnlineGenresAndTags()
      .then(genres => {
        setAllGenres(genres);
      })
      .catch(err => {
        console.error('[Genres Autocomplete] Failed to fetch live genres:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter available options based on search query and exclude already selected ones
  const queryLower = searchQuery.toLowerCase().trim();
  const filteredOptions = allGenres.filter(g => {
    const isMatched = g.toLowerCase().includes(queryLower);
    const isAlreadySelected = selected.includes(g);
    return isMatched && !isAlreadySelected;
  });

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
        setFocusedIndex(prev => (prev + 1) % (filteredOptions.length || 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + filteredOptions.length) % (filteredOptions.length || 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          handleToggle(filteredOptions[focusedIndex]);
        } else if (filteredOptions.length > 0) {
          handleToggle(filteredOptions[0]);
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

  const handleToggle = (genre: string) => {
    if (selected.includes(genre)) {
      onChange(selected.filter(g => g !== genre));
    } else {
      if (selected.length >= 30) {
        // Artificially high and sensible limit (30) to preserve recommendation vector calculation quality
        return;
      }
      onChange([...selected, genre]);
    }
    setSearchQuery('');
    setFocusedIndex(-1);
  };

  // Keep focused item scrolled into view
  useEffect(() => {
    if (focusedIndex >= 0 && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector(`[data-index="${focusedIndex}"]`) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  return (
    <div className="space-y-3 w-full" ref={containerRef} id="live-genres-multiselect">
      {/* Label and Count Display */}
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
          <Heart className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          Discovery Genre Bias ({selected.length} active)
        </label>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[9px] font-mono font-bold uppercase tracking-wider text-red-400/80 hover:text-red-400 cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Selected Items Badges List */}
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 p-3.5 bg-zinc-950/45 rounded-2xl border border-zinc-850/80 animate-fade-in">
          {selected.map((genre) => (
            <span
              key={genre}
              className="inline-flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all select-none"
            >
              <span>{genre}</span>
              <button
                type="button"
                onClick={() => handleToggle(genre)}
                className="text-indigo-400/60 hover:text-indigo-300 p-0.5 rounded transition-colors cursor-pointer"
              >
                <X className="h-3 w-3 shrink-0" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="text-center py-5 px-4 bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-850/70">
          <p className="text-xs text-zinc-550 font-medium">No custom bias filters chosen.</p>
          <p className="text-[10px] text-zinc-600 mt-1">Select genres below to prioritize content alignment.</p>
        </div>
      )}

      {/* Dropdown Input trigger field */}
      <div className="relative">
        <div 
          className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-zinc-950 border transition-all cursor-text ${
            isOpen ? 'border-indigo-500/55 ring-4 ring-indigo-500/5' : 'border-zinc-850 hover:border-zinc-750'
          }`}
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
        >
          <Search className="h-4 w-4 text-zinc-550 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
              setFocusedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              selected.length >= 30 
                ? 'Maximum of 30 genres reached' 
                : 'Search and select from all genres & tags (e.g. Isekai, Cyberpunk)...'
            }
            disabled={selected.length >= 30}
            className="w-full bg-transparent text-xs text-zinc-150 placeholder-zinc-650 focus:outline-none disabled:cursor-not-allowed"
          />
          {isLoading && (
            <Loader2 className="h-4 w-4 text-indigo-500 shrink-0 animate-spin" />
          )}
        </div>

        {/* Floating drop-down list of remaining available genres & tags */}
        {isOpen && selected.length < 30 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[250px] animate-fade-in"
            id="live-genres-dropdown-panel"
          >
            <div className="overflow-y-auto p-1 divide-y divide-zinc-900/50">
              {filteredOptions.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <p className="text-xs font-bold text-zinc-450">No remaining genres match "{searchQuery}"</p>
                  <p className="text-[10px] text-zinc-650 mt-1">Try another tag name or check spelling.</p>
                </div>
              ) : (
                filteredOptions.map((genre, idx) => {
                  const isFocused = focusedIndex === idx;
                  return (
                    <button
                      key={genre}
                      type="button"
                      data-index={idx}
                      onClick={() => handleToggle(genre)}
                      className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-all ${
                        isFocused
                          ? 'bg-zinc-900 text-zinc-150'
                          : 'text-zinc-400 hover:bg-zinc-900/55 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Plus className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span className="text-xs font-semibold text-zinc-150 truncate">{genre}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isFocused && (
                          <span className="text-[8px] font-mono font-medium text-zinc-600 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-850">
                            ENTER
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
