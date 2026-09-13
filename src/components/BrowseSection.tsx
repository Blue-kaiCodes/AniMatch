import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, HelpCircle, Loader2, X } from 'lucide-react';
import { Anime, WatchListEntry } from '../types';
import AnimeCard from './AnimeCard';

interface BrowseSectionProps {
  onSelectAnime: (anime: Anime) => void;
  onAddToWatchList: (e: React.MouseEvent, anime: Anime, status: 'want_to_watch' | 'watching' | 'completed') => void;
  onRemoveFromWatchList?: (e: React.MouseEvent, animeId: number) => void;
  watchList: WatchListEntry[];
}

export default function BrowseSection({ 
  onSelectAnime, 
  onAddToWatchList, 
  onRemoveFromWatchList,
  watchList 
}: BrowseSectionProps) {
  // Query Filters State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState('All');
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState('popularity');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 24;

  // Data & loading states
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [allGenres, setAllGenres] = useState<string[]>([
    'Action',
    'Adventure',
    'Comedy',
    'Drama',
    'Ecchi',
    'Fantasy',
    'Horror',
    'Mecha',
    'Mystery',
    'Psychological',
    'Romance',
    'Sci-Fi',
    'Slice of Life',
    'Sports',
    'Supernatural',
    'Suspense',
    'Thriller'
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Debounce the search input updates to prevent API flooding
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Trigger loading when any filter or page updates
  useEffect(() => {
    const fetchFilteredAnime = async () => {
      setIsLoading(true);
      try {
        const offset = (currentPage - 1) * itemsPerPage;
        const genresParam = selectedGenres.join(',');
        
        const url = `/api/anime?search=${encodeURIComponent(debouncedSearch)}&genres=${encodeURIComponent(genresParam)}&type=${selectedType}&score=${minScore}&sortBy=${sortBy}&limit=${itemsPerPage}&offset=${offset}`;
        
        const res = await fetch(url);
        if (res.ok) {
          const result = await res.json();
          setAnimeList(result.data || []);
          setTotalCount(result.total || 0);
          setAllGenres(result.genres || []);
        }
      } catch (err) {
        console.error('Error fetching browsed anime:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilteredAnime();
  }, [debouncedSearch, selectedGenres, selectedType, minScore, sortBy, currentPage]);

  // Reset pagination when filter updates
  const handleFilterChange = (updater: () => void) => {
    updater();
    setCurrentPage(1);
  };

  // Toggle individual genre tag selection
  const handleToggleGenre = (genre: string) => {
    handleFilterChange(() => {
      if (selectedGenres.includes(genre)) {
        setSelectedGenres(selectedGenres.filter(g => g !== genre));
      } else {
        setSelectedGenres([...selectedGenres, genre]);
      }
    });
  };

  // Clear all active filter overrides
  const handleClearFilters = () => {
    handleFilterChange(() => {
      setSearch('');
      setSelectedGenres([]);
      setSelectedType('All');
      setMinScore(0);
      setSortBy('popularity');
    });
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto" id="browse-section-root">
      
      {/* Search Input and Filter togglers */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch justify-between">
        
        {/* Search Bar */}
        <div className="relative flex-1 flex items-center h-10">
          <Search className="absolute left-4 h-4.5 w-4.5 text-zinc-500 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleFilterChange(() => setSearch(e.target.value))}
            placeholder="Filter titles or studios..."
            aria-label="Filter titles or studios"
            className="w-full h-full rounded-xl bg-zinc-900 border border-zinc-800 focus:border-indigo-500/50 pl-11 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-md flex items-center"
          />
        </div>

        {/* Filter Toolbar Controls */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Quick Clear Filter trigger (visible when filters are active) */}
          {(search || selectedGenres.length > 0 || selectedType !== 'All' || minScore > 0 || sortBy !== 'popularity') && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-zinc-400 hover:text-white bg-zinc-900/50 border border-zinc-800/80 hover:bg-zinc-850 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
              <span>Reset</span>
            </button>
          )}

          {/* Sorter Selector */}
          <select
            value={sortBy}
            onChange={(e) => handleFilterChange(() => setSortBy(e.target.value))}
            className="rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-semibold px-3 py-2 focus:outline-none focus:border-indigo-500/50 cursor-pointer shadow-md"
          >
            <option value="popularity">Popularity Index</option>
            <option value="score">Rating Score</option>
            <option value="year">Release Year</option>
            <option value="title">Title (A-Z)</option>
          </select>

          {/* Collapsible advanced filters toggle */}
          <button
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all shadow-md cursor-pointer ${
              showFiltersPanel || selectedGenres.length > 0 || selectedType !== 'All' || minScore > 0
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
            {(selectedGenres.length > 0 || selectedType !== 'All' || minScore > 0) && (
              <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white leading-none">
                {selectedGenres.length + (selectedType !== 'All' ? 1 : 0) + (minScore > 0 ? 1 : 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Advanced Filters Panel */}
      {showFiltersPanel && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-5 animate-in slide-in-from-top-2 fade-in duration-200">
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            
            {/* Type selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Release Format</label>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'TV', 'Movie', 'OVA', 'Special'].map((t) => (
                  <button
                    key={t}
                    onClick={() => handleFilterChange(() => setSelectedType(t))}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                      selectedType === t
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                        : 'bg-zinc-950/40 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Score slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Minimum Rating</label>
                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">{minScore > 0 ? `★ ${minScore.toFixed(1)}+` : 'Any'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="9"
                step="0.5"
                value={minScore}
                onChange={(e) => handleFilterChange(() => setMinScore(parseFloat(e.target.value)))}
                className="w-full accent-indigo-600 cursor-pointer h-1 bg-zinc-800 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[9px] text-zinc-600 font-bold">
                <span>Any</span>
                <span>7.0</span>
                <span>8.0</span>
                <span>9.0</span>
              </div>
            </div>
          </div>

          {/* Genre Chips list selection */}
          <div className="space-y-2 pt-2 border-t border-zinc-850">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Genres (Select multi-tags)</label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-2">
              {allGenres.map((genre) => {
                const isSelected = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    onClick={() => handleToggleGenre(genre)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400'
                        : 'bg-zinc-950/30 border-zinc-850 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Grid Grid Items display */}
      <div className="relative min-h-[400px]">
        {isLoading ? (
          /* Grid Skeleton Loaders */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-1 space-y-3 h-[290px] animate-pulse">
                <div className="aspect-[3/4] bg-zinc-950 rounded-xl" />
                <div className="p-3 space-y-2.5">
                  <div className="h-3.5 bg-zinc-800 rounded w-5/6" />
                  <div className="h-2.5 bg-zinc-850 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : animeList.length === 0 ? (
          /* Empty Grid state */
          <div className="flex flex-col items-center justify-center py-24 text-center max-w-sm mx-auto space-y-4">
            <HelpCircle className="h-12 w-12 text-zinc-600 stroke-1" />
            <div className="space-y-1">
              <h3 className="text-zinc-300 font-semibold text-sm">No anime matches found</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">We couldn't locate any anime titles matching your selected tags or keywords. Try clearing some filters.</p>
            </div>
            <button
              onClick={handleClearFilters}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          /* Active grid render */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {animeList.map((anime) => (
              <AnimeCard
                key={anime.mal_id}
                anime={anime}
                currentStatus={watchList.find(entry => entry.anime.mal_id === anime.mal_id)?.status}
                onAddToWatchList={onAddToWatchList}
                onRemoveFromWatchList={onRemoveFromWatchList}
                onClick={() => onSelectAnime(anime)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls Footer */}
      {!isLoading && animeList.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-zinc-850">
          <p className="text-xs text-zinc-500 font-medium">
            Showing <span className="text-zinc-300">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-zinc-300">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of <span className="text-zinc-300">{totalCount}</span> entries
          </p>

          <div className="flex items-center gap-1.5">
            {/* Prev page button */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 disabled:bg-zinc-950 transition-all cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Quick pages summary */}
            <span className="text-xs text-zinc-400 font-bold px-3">
              Page {currentPage} of {totalPages}
            </span>

            {/* Next page button */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 disabled:bg-zinc-950 transition-all cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
