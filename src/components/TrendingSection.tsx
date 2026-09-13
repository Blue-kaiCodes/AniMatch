import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Star, Calendar, Loader2 } from 'lucide-react';
import { Anime, WatchListEntry } from '../types';
import AnimeCard from './AnimeCard';

interface TrendingSectionProps {
  watchList: WatchListEntry[];
  onAddToWatchList: (e: React.MouseEvent, anime: Anime, status: 'want_to_watch' | 'watching' | 'completed') => void;
  onRemoveFromWatchList?: (e: React.MouseEvent, animeId: number) => void;
  onSelectAnime: (anime: Anime) => void;
}

type TrendingTab = 'trending' | 'top_rated' | 'seasonal';

export default function TrendingSection({ 
  watchList, 
  onAddToWatchList, 
  onRemoveFromWatchList,
  onSelectAnime 
}: TrendingSectionProps) {
  const [activeTab, setActiveTab] = useState<TrendingTab>('trending');
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSectionData = async () => {
      setIsLoading(true);
      try {
        let sortBy = 'popularity';
        if (activeTab === 'top_rated') sortBy = 'score';
        if (activeTab === 'seasonal') sortBy = 'year';

        const res = await fetch(`/api/anime?sortBy=${sortBy}&limit=12`);
        if (res.ok) {
          const data = await res.json();
          setAnimeList(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching section data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSectionData();
  }, [activeTab]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto" id="trending-section-root">
      {/* Header hero panel */}
      <div className="relative overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
        
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Flame className="h-3.5 w-3.5 animate-pulse" />
            Seasonal Charts
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white leading-tight">
            Discover What's Hot and Highly Rated
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-lg">
            Stay ahead with live, real-time lists tracking active fan interest, global ratings, and brand new seasonal releases.
          </p>
        </div>

        {/* Tab buttons switcher */}
        <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-850 shrink-0">
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'trending'
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            Trending
          </button>
          <button
            onClick={() => setActiveTab('top_rated')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'top_rated'
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Star className="h-3.5 w-3.5 text-amber-400" />
            Top Rated
          </button>
          <button
            onClick={() => setActiveTab('seasonal')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'seasonal'
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
            Seasonal Highlights
          </button>
        </div>
      </div>

      {/* Main card viewport */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-24 space-y-4"
          >
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Fetching seasonal lists...</p>
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
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

            {animeList.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500">
                <p className="text-xs italic">No listings returned for this specific category.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
