import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface SearchableSelectProps {
  options: { label: string; value: string; extra?: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  id?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  className = '',
  id
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedOption = options.find(o => o.value === value);

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.extra && o.extra.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearch('');
    }
  }, [isOpen]);

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
        setFocusedIndex(prev => (prev + 1) % filteredOptions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          onChange(filteredOptions[focusedIndex].value);
          setIsOpen(false);
        } else if (filteredOptions.length > 0) {
          onChange(filteredOptions[0].value);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[focusedIndex + 1] as HTMLElement; // +1 to skip search input container
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  return (
    <div className={`relative ${className}`} ref={containerRef} id={id}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="w-full flex items-center justify-between rounded-xl bg-zinc-950 border border-zinc-850 hover:border-zinc-750 focus:border-indigo-500/40 py-2.5 px-4 text-xs text-zinc-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all cursor-pointer text-left"
      >
        <span className="truncate">
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.extra && <span className="text-sm shrink-0">{selectedOption.extra}</span>}
              <span>{selectedOption.label}</span>
            </span>
          ) : (
            <span className="text-zinc-500">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 text-zinc-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1.5 w-full max-h-60 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-2xl animate-fade-in flex flex-col"
        >
          {/* Search Box */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-900 sticky top-0 bg-zinc-950 z-10">
            <Search className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setFocusedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none"
            />
          </div>

          {/* Options */}
          <div className="py-1 flex-1 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="text-center py-4 text-zinc-500 text-[11px] italic">No results found</p>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = value === opt.value;
                const isFocused = focusedIndex === idx;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : isFocused
                        ? 'bg-zinc-850 text-zinc-200'
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {opt.extra && <span className="text-sm shrink-0">{opt.extra}</span>}
                      <span className="truncate">{opt.label}</span>
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-white shrink-0" />}
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
