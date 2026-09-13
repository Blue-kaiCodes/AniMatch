import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Calendar, Clock, Tv, Film, Plus, Check, ChevronRight, ChevronDown, HelpCircle, Loader2, BookOpen, Info } from 'lucide-react';
import { Anime, WatchListEntry } from '../types';
import { cacheAnime, getCachedAnime } from '../utils/animeCache';

interface AnimeDetailModalProps {
  anime: Anime | null;
  onClose: () => void;
  onAddToWatchList: (anime: Anime, status: 'want_to_watch' | 'watching' | 'completed') => void;
  onRemoveFromWatchList?: (animeId: number) => void;
  watchList: WatchListEntry[];
  onSelectAnime: (anime: Anime) => void;
}

export default function AnimeDetailModal({ 
  anime, 
  onClose, 
  onAddToWatchList, 
  onRemoveFromWatchList,
  watchList, 
  onSelectAnime 
}: AnimeDetailModalProps) {
  const [activeAnime, setActiveAnime] = useState<Anime | null>(null);
  const [activeFullAnime, setActiveFullAnime] = useState<Anime | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [recommendations, setRecommendations] = useState<(Anime & { similarity: number })[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync state with prop
  useEffect(() => {
    if (anime) {
      const cached = getCachedAnime(anime.mal_id);
      setActiveAnime(cached || anime);
      setActiveFullAnime(cached || anime); // temporary sync
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [anime]);

  // Click outside watch status dropdown handler
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Fetch full details & dynamic properties
  useEffect(() => {
    if (!anime) return;
    setIsLoadingDetails(true);
    
    const fetchFullDetails = async () => {
      try {
        const res = await fetch(`/api/anime/${anime.mal_id}`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            cacheAnime(data);
          }
          setActiveFullAnime(data || anime);
        }
      } catch (err) {
        console.error('Error fetching deep anime details:', err);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchFullDetails();
  }, [anime]);

  // Fetch dynamic recommendations in context of detail view
  useEffect(() => {
    if (!anime) return;
    setIsLoadingRecommendations(true);

    const fetchRecommendations = async () => {
      try {
        const res = await fetch(`/api/recommend/${anime.mal_id}?limit=5`);
        if (res.ok) {
          const data = await res.json();
          setRecommendations(data.recommendations || []);
        }
      } catch (err) {
        console.error('Error fetching recommendations in detail panel:', err);
      } finally {
        setIsLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [anime]);



  const handleSelectAnime = (newAnime: Anime) => {
    onSelectAnime(newAnime);
  };

  return (
    <AnimatePresence>
      {isOpen && (() => {
        const fullAnime = activeFullAnime || activeAnime;
        if (!fullAnime) return null;
        
        // Check if saved in watchList
        const savedEntry = watchList.find(entry => entry.anime.mal_id === fullAnime.mal_id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-end overflow-hidden" id="detail-modal-root">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />

            {/* Slide-over Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="relative z-10 h-full w-full max-w-xl bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col"
            >
          {/* Header Action Row */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            {/* Watch List Action Dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold border transition-all duration-200 shadow-md ${
                  savedEntry
                    ? 'bg-indigo-600 text-white border-indigo-500/40 hover:bg-indigo-750'
                    : 'bg-zinc-800/90 border-zinc-700/60 text-zinc-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-500/20'
                }`}
              >
                {savedEntry ? (
                  <>
                    <Check className="h-4 w-4 shrink-0" />
                    <span>{savedEntry.status === 'want_to_watch' ? 'Plan to Watch' : savedEntry.status === 'watching' ? 'Watching' : 'Completed'}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-80 shrink-0" />
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>Add to Board</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-80 shrink-0" />
                  </>
                )}
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 top-10.5 z-35 w-44 rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl">
                  <div className="text-[9px] font-bold text-zinc-500 px-2 py-1 uppercase tracking-wider">Set Watch Status</div>
                  <button
                    onClick={() => {
                      onAddToWatchList(fullAnime, 'want_to_watch');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-semibold transition-colors flex items-center justify-between ${
                      savedEntry?.status === 'want_to_watch'
                        ? 'bg-indigo-600 text-white'
                        : 'text-zinc-300 hover:bg-zinc-850'
                    }`}
                  >
                    <span>Plan to Watch</span>
                    {savedEntry?.status === 'want_to_watch' && <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      onAddToWatchList(fullAnime, 'watching');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-semibold transition-colors flex items-center justify-between ${
                      savedEntry?.status === 'watching'
                        ? 'bg-indigo-600 text-white'
                        : 'text-zinc-300 hover:bg-zinc-850'
                    }`}
                  >
                    <span>Watching</span>
                    {savedEntry?.status === 'watching' && <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      onAddToWatchList(fullAnime, 'completed');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-semibold transition-colors flex items-center justify-between ${
                      savedEntry?.status === 'completed'
                        ? 'bg-indigo-600 text-white'
                        : 'text-zinc-300 hover:bg-zinc-850'
                    }`}
                  >
                    <span>Completed</span>
                    {savedEntry?.status === 'completed' && <Check className="h-3.5 w-3.5" />}
                  </button>
                  
                  {savedEntry && onRemoveFromWatchList && (
                    <div className="border-t border-zinc-800/60 my-1 pt-1">
                      <button
                        onClick={() => {
                          onRemoveFromWatchList(fullAnime.mal_id);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg font-semibold transition-colors"
                      >
                        Remove from Board
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Close Trigger Button */}
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Large Image Header */}
          <div className="relative h-64 bg-zinc-950 overflow-hidden shrink-0">
            {/* Banner Backdrop */}
            {fullAnime.bannerImage ? (
              <img
                src={fullAnime.bannerImage}
                alt="Backdrop banner"
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-cover opacity-35"
              />
            ) : (
              <img
                src={fullAnime.image}
                alt="Backdrop blur fallback"
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-20 scale-125"
              />
            )}
            {/* Radial dark vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
            
            {/* Inner Content Grid */}
            <div className="absolute inset-x-6 bottom-4 flex items-end gap-5">
              {/* Main Poster Image */}
              <div className="h-32 w-24 shrink-0 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950 shadow-xl">
                <img
                  src={fullAnime.image}
                  alt={fullAnime.english_title || fullAnime.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              
              {/* Text Meta info */}
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300 border border-zinc-700/40 uppercase">
                    {fullAnime.type}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {fullAnime.score.toFixed(2)}
                  </div>
                  {isLoadingDetails && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                  )}
                </div>

                <h2 className="text-xl font-display font-bold text-white line-clamp-2 leading-snug">
                  {fullAnime.english_title || fullAnime.title}
                </h2>
                
                {fullAnime.english_title && fullAnime.english_title !== fullAnime.title && (
                  <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{fullAnime.title}</p>
                )}
              </div>
            </div>
          </div>

          {/* Body Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Grid Metadata Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-950/40 border border-zinc-800/40 p-4 rounded-xl">
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Studio</p>
                      <p className="text-xs text-zinc-200 font-medium truncate" title={fullAnime.studio}>{fullAnime.studio || 'N/A'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Year / Season</p>
                      <p className="text-xs text-zinc-200 font-medium">{fullAnime.year || 'N/A'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Episodes</p>
                      <p className="text-xs text-zinc-200 font-medium">{fullAnime.episodes || 'Unknown'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Status</p>
                      <p className="text-xs text-zinc-200 font-medium truncate" title={fullAnime.status}>{fullAnime.status || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Synopsis Text */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-display font-bold text-zinc-200 tracking-wide">Synopsis</h3>
                    <p className="text-xs leading-relaxed text-zinc-400 text-justify whitespace-pre-line">
                      {fullAnime.synopsis}
                    </p>
                  </div>

                  {/* Genre Tag Chips */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-display font-bold text-zinc-200 tracking-wide">Genres</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {fullAnime.genres.map((genre) => (
                        <span
                          key={genre}
                          className="rounded-lg bg-zinc-850 px-2.5 py-1 text-xs text-zinc-300 border border-zinc-800"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Official Video Trailer (Dynamic) */}
                  {fullAnime.trailer?.id && fullAnime.trailer?.site === 'youtube' && (
                    <div className="space-y-2.5 pt-1">
                      <h3 className="text-sm font-display font-bold text-zinc-200 tracking-wide">Official Video Trailer</h3>
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-zinc-800/80 bg-black shadow-lg">
                        <iframe
                          src={`https://www.youtube.com/embed/${fullAnime.trailer.id}`}
                          title={`${fullAnime.english_title || fullAnime.title} Trailer`}
                          className="absolute inset-0 h-full w-full"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}

                  {/* Characters Cast (Dynamic) */}
                  {fullAnime.characters && fullAnime.characters.length > 0 && (
                    <div className="space-y-3 pt-1">
                      <h3 className="text-sm font-display font-bold text-zinc-200 tracking-wide">Main Characters & Cast</h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {fullAnime.characters.slice(0, 8).map((char) => (
                          <div key={char.id} className="flex flex-col space-y-1 bg-zinc-950/20 border border-zinc-800/50 rounded-xl p-1.5 shadow-inner">
                            <div className="relative h-28 w-full rounded-lg overflow-hidden bg-zinc-900">
                              <img
                                src={char.image}
                                alt={char.name}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent p-1.5 pt-4">
                                <p className="text-[9px] font-bold text-white truncate">{char.name}</p>
                                <p className="text-[7px] text-indigo-400 capitalize truncate mt-0.5">{char.role.toLowerCase()}</p>
                              </div>
                            </div>
                            
                            {char.voiceActor && (
                              <div className="flex items-center gap-1.5 pt-0.5 border-t border-zinc-800/40">
                                <img
                                  src={char.voiceActor.image}
                                  alt={char.voiceActor.name}
                                  referrerPolicy="no-referrer"
                                  className="h-5 w-5 rounded-full object-cover shrink-0 bg-zinc-900 border border-zinc-800"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[8px] font-medium text-zinc-300 truncate">{char.voiceActor.name}</p>
                                  <p className="text-[6px] text-zinc-500 uppercase font-bold">Seiyuu</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related Series (Dynamic) */}
                  {fullAnime.relations && fullAnime.relations.length > 0 && (
                    <div className="space-y-3 pt-1">
                      <h3 className="text-sm font-display font-bold text-zinc-200 tracking-wide">Related Series</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {fullAnime.relations.slice(0, 6).map((rel) => (
                          <div
                            key={rel.mal_id}
                            onClick={() => onSelectAnime(rel as any)}
                            className="group flex items-center gap-2.5 bg-zinc-950/40 hover:bg-zinc-850 border border-zinc-800/60 hover:border-zinc-700/80 p-2 rounded-xl cursor-pointer transition-all duration-200"
                          >
                            <img
                              src={rel.image}
                              alt={rel.title}
                              referrerPolicy="no-referrer"
                              className="h-11 w-9 rounded-md object-cover bg-zinc-900 shrink-0 shadow border border-zinc-800/40"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-zinc-200 group-hover:text-indigo-400 truncate transition-colors">{rel.title}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[8px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1 py-0.5 rounded-md font-bold uppercase tracking-wider scale-90 origin-left">
                                  {rel.relationType.replace(/_/g, ' ')}
                                </span>
                                <span className="text-[8px] text-zinc-500 capitalize">{rel.type.toLowerCase()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Similarity Recommendations List */}
                  <div className="space-y-3 pt-1">
                    <h3 className="text-sm font-display font-bold text-zinc-200 tracking-wide flex items-center justify-between">
                      <span>Similar Recommendations</span>
                      {isLoadingRecommendations && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}
                    </h3>

                    <div className="space-y-2.5">
                      {!isLoadingRecommendations && recommendations.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic">No recommendations available for this title.</p>
                      ) : (
                        recommendations.map((rec) => (
                          <div
                            key={rec.mal_id}
                            onClick={() => onSelectAnime(rec)}
                            className="group flex items-center gap-3 bg-zinc-950/40 hover:bg-zinc-850 border border-zinc-800/50 hover:border-zinc-700/60 p-2.5 rounded-xl cursor-pointer transition-all duration-200"
                          >
                            <img
                              src={rec.image}
                              alt={rec.english_title || rec.title}
                              referrerPolicy="no-referrer"
                              className="h-12 w-9 rounded-md object-cover bg-zinc-900 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-400 transition-colors truncate">
                                {rec.english_title || rec.title}
                              </h4>
                              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                                {rec.genres.slice(0, 3).join(', ')}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
          </div>
            </motion.div>
          </div>
        );
      })()}
    </AnimatePresence>
  );
}
