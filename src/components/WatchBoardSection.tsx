import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Check, Trash2, ArrowRight, ArrowLeft, Bookmark, Share2 } from 'lucide-react';
import { Anime, WatchListEntry } from '../types';
import { getCachedAnime } from '../utils/animeCache';

interface WatchBoardSectionProps {
  watchList: WatchListEntry[];
  onUpdateStatus: (animeId: number, status: 'want_to_watch' | 'watching' | 'completed') => void;
  onUpdatePriority: (animeId: number, priority: 'low' | 'medium' | 'high') => void;
  onRemove: (animeId: number) => void;
  onSelectAnime: (anime: Anime) => void;
  isGuest?: boolean;
  onSignInTrigger?: () => void;
  onShareToFeed?: (anime: Anime, status: string) => void;
}

export default function WatchBoardSection({ 
  watchList, 
  onUpdateStatus, 
  onUpdatePriority, 
  onRemove, 
  onSelectAnime, 
  isGuest, 
  onSignInTrigger,
  onShareToFeed
}: WatchBoardSectionProps) {
  
  // Categorize list entries
  const columns = {
    want_to_watch: {
      title: 'Want to Watch',
      color: 'border-zinc-800 text-zinc-400 bg-zinc-950/25',
      icon: <Bookmark className="h-4 w-4" />,
      items: watchList.filter(item => item.status === 'want_to_watch')
    },
    watching: {
      title: 'Watching',
      color: 'border-amber-500/20 text-amber-400 bg-amber-500/5',
      icon: <Play className="h-4 w-4 fill-current" />,
      items: watchList.filter(item => item.status === 'watching')
    },
    completed: {
      title: 'Completed',
      color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5',
      icon: <Check className="h-4 w-4" />,
      items: watchList.filter(item => item.status === 'completed')
    }
  };

  // Priority color guides
  const getPriorityColor = (p: 'low' | 'medium' | 'high') => {
    switch (p) {
      case 'high': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'low': return 'text-zinc-400 bg-zinc-800 border-zinc-700/50';
    }
  };

  if (isGuest) {
    return (
      <div className="space-y-6 animate-fade-in max-w-7xl mx-auto" id="watch-board-root">
        <div className="flex flex-col items-center justify-center py-20 border border-zinc-800 bg-zinc-900/10 rounded-3xl max-w-lg mx-auto text-center p-8 space-y-6 shadow-xl">
          <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-md">
            <Bookmark className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-zinc-200 font-display font-bold text-lg">Save & track your progress</h3>
            <p className="text-zinc-400 text-xs leading-relaxed max-w-xs mx-auto">
              Unlock your personalized AniMatch Watch Board to map out, rank, and track lanes for high-priority anime titles.
            </p>
          </div>
          <button
            onClick={onSignInTrigger}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-3 cursor-pointer transition-all shadow-md font-sans"
          >
            Create or Sign In to your Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto" id="watch-board-root">
      
      {/* Intro Subheader description */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-white tracking-wide flex items-center gap-2">
            <span>Watch Board Planner</span>
            <span className="text-xs bg-zinc-800 px-2.5 py-0.5 rounded-full text-zinc-400 border border-zinc-700/50">
              {watchList.length} Total Titles
            </span>
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Map out your anime journey by categorizing. Priority indices and progress statuses are saved on-device.
          </p>
        </div>
      </div>

      {watchList.length === 0 ? (
        /* Empty board state */
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-zinc-800 bg-zinc-900/10 rounded-3xl max-w-lg mx-auto text-center p-6 space-y-4">
          <Bookmark className="h-12 w-12 text-zinc-600 stroke-1" />
          <div className="space-y-1">
            <h3 className="text-zinc-300 font-semibold text-sm">Your planner board is currently empty</h3>
            <p className="text-zinc-500 text-xs leading-relaxed max-w-xs mx-auto">
              Browse anime in the <strong>Discover</strong> or <strong>Filters</strong> tabs and click the "+" action to save them to your custom board lanes!
            </p>
          </div>
        </div>
      ) : (
        /* Columns lanes */
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {(Object.keys(columns) as Array<keyof typeof columns>).map((colKey) => {
            const col = columns[colKey];
            return (
              <div key={colKey} className="flex flex-col rounded-2xl bg-zinc-950/40 border border-zinc-850 h-[600px] overflow-hidden">
                
                {/* Column Lane Header */}
                <div className={`p-4 border-b border-zinc-850 flex items-center justify-between shrink-0 ${col.color}`}>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    {col.icon}
                    <span>{col.title}</span>
                  </div>
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 px-1 text-[10px] font-bold text-zinc-400">
                    {col.items.length}
                  </span>
                </div>

                {/* Column Lane Scrollable body list of cards */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <AnimatePresence initial={false}>
                    {col.items.length === 0 ? (
                      <div className="h-full flex items-center justify-center py-20 text-center border border-dashed border-zinc-900 rounded-xl text-zinc-600 text-xs italic">
                        Lane is empty
                      </div>
                    ) : (
                      col.items.map((item) => {
                        const resolvedAnime = getCachedAnime(item.anime.mal_id) || item.anime;
                        return (
                          <motion.div
                            key={resolvedAnime.mal_id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="group relative bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 p-3 rounded-xl shadow-lg transition-all flex flex-col gap-3"
                          >
                            {/* Inner mini grid */}
                            <div 
                              className="flex gap-3 cursor-pointer"
                              onClick={() => onSelectAnime(resolvedAnime)}
                            >
                              {/* Thumb image */}
                              <img
                                src={resolvedAnime.image}
                                alt={resolvedAnime.english_title || resolvedAnime.title}
                                className="h-16 w-12 rounded-lg object-cover bg-zinc-950 shrink-0"
                              />
                              
                              {/* Meta texts */}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-zinc-200 group-hover:text-indigo-400 transition-colors line-clamp-1" title={resolvedAnime.english_title || resolvedAnime.title}>
                                  {resolvedAnime.english_title || resolvedAnime.title}
                                </h4>
                                
                                <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                                  {resolvedAnime.studio} ({resolvedAnime.year})
                                </p>

                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-[9px] text-zinc-500 font-bold uppercase">
                                    {resolvedAnime.type} • {resolvedAnime.episodes} eps
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Controls Footer row */}
                            <div className="flex items-center justify-between border-t border-zinc-850 pt-2.5 mt-0.5">
                            
                            {/* Priority Dropdown Tag & Share Trigger */}
                            <div className="flex items-center gap-1.5">
                              <select
                                value={item.priority}
                                onChange={(e) => onUpdatePriority(item.anime.mal_id, e.target.value as any)}
                                className={`text-[9px] font-bold rounded-md px-1.5 py-0.5 border cursor-pointer focus:outline-none focus:ring-0 ${getPriorityColor(item.priority)}`}
                              >
                                <option value="low">Low Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="high">High Priority</option>
                              </select>

                              {onShareToFeed && (
                                <button
                                  onClick={() => onShareToFeed(resolvedAnime, item.status)}
                                  title="Share progress to community feed"
                                  className="p-1 rounded-md text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/5 transition-colors cursor-pointer"
                                >
                                  <Share2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Move triggers */}
                            <div className="flex items-center gap-1">
                              {/* Move Left */}
                              {colKey !== 'want_to_watch' && (
                                <button
                                  onClick={() => {
                                    const nextStatus = colKey === 'completed' ? 'watching' : 'want_to_watch';
                                    onUpdateStatus(item.anime.mal_id, nextStatus);
                                  }}
                                  title="Demote to previous lane"
                                  className="p-1 rounded-md text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/5 transition-colors cursor-pointer"
                                >
                                  <ArrowLeft className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {/* Move Right / Promote */}
                              {colKey !== 'completed' && (
                                <button
                                  onClick={() => {
                                    const nextStatus = colKey === 'want_to_watch' ? 'watching' : 'completed';
                                    onUpdateStatus(item.anime.mal_id, nextStatus);
                                  }}
                                  title="Promote to next lane"
                                  className="p-1 rounded-md text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/5 transition-colors cursor-pointer"
                                >
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {/* Quick delete */}
                              <button
                                  onClick={() => onRemove(item.anime.mal_id)}
                                  title="Remove from board"
                                  className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ); })
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
