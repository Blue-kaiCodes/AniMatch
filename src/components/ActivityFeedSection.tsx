import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, MessageCircle, Share2, Plus, TrendingUp, Flame, 
  Calendar, Send, Tv, User as UserIcon, CheckCircle2, Bookmark, Users, Loader2
} from 'lucide-react';
import { User, Anime, WatchListEntry, ActivityFeedItem } from '../types';
import { getCachedAnime } from '../utils/animeCache';
import { AvatarDisplay } from './AuthModal';

// Interactive Spoiler Component for social feed
const SpoilerContainer = ({ text }: { text: string }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <div 
      onClick={() => setRevealed(true)}
      className={`relative cursor-pointer transition-all duration-300 rounded-xl overflow-hidden ${
        revealed ? 'bg-zinc-950/20 p-1' : 'bg-zinc-950/90 border border-zinc-800 p-6 min-h-[50px] flex items-center justify-center select-none'
      }`}
    >
      <div className={revealed ? '' : 'filter blur-md pointer-events-none opacity-20'}>
        <p className="text-xs sm:text-sm text-zinc-350 leading-relaxed whitespace-pre-wrap text-left">
          {text}
        </p>
      </div>
      {!revealed && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase tracking-wider text-rose-400 bg-black/40">
          ⚠️ SPOILER - Click to Reveal
        </span>
      )}
    </div>
  );
};

interface ActivityFeedSectionProps {
  currentUser: User | null;
  animeList: Anime[];
  watchList?: WatchListEntry[];
  onSelectAnime: (anime: Anime) => void;
  onSignInTrigger: () => void;
  showToast?: (message: string, type?: 'success' | 'info') => void;
}

export default function ActivityFeedSection({
  currentUser,
  animeList,
  watchList = [],
  onSelectAnime,
  onSignInTrigger,
  showToast
}: ActivityFeedSectionProps) {
  const [feedItems, setFeedItems] = useState<ActivityFeedItem[]>([]);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Post Creator State
  const [isExpanded, setIsExpanded] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [newPostType, setNewPostType] = useState<'discussion' | 'review' | 'recommendation' | 'question' | 'spoiler'>('discussion');
  const [newPostRating, setNewPostRating] = useState<number>(10);
  const [newPostAnimeId, setNewPostAnimeId] = useState<number>(0);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Fetch real activities from PostgreSQL
  const fetchFeed = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/activities');
      if (res.ok) {
        const data = await res.json();
        // Filter out any hardcoded/mock users to maintain pristine database integrity
        const realData = data.filter((item: any) => {
          const uId = item.userId;
          const uName = (item.username || '').toLowerCase();
          return uId && !uId.startsWith('mock-') && 
                 uName !== 'akira' && uName !== 'yuki' && 
                 uName !== 'haruto' && uName !== 'rei' && uName !== 'kenji';
        });
        setFeedItems(realData);
      }
    } catch (err) {
      console.error('Error fetching real activities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  // Handle Like with Postgres storage
  const handleLike = async (itemId: string) => {
    if (!currentUser) {
      onSignInTrigger();
      return;
    }

    try {
      const res = await fetch(`/api/activities/${itemId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        }
      });
      if (res.ok) {
        const updatedItem = await res.json();
        setFeedItems(prev => prev.map(item => item.id === itemId ? updatedItem : item));
      }
    } catch (err) {
      console.error('Error liking activity:', err);
    }
  };

  // Handle Write Comment with Postgres storage
  const handleComment = async (e: React.FormEvent, itemId: string) => {
    e.preventDefault();
    const inputVal = commentInputs[itemId]?.trim();
    if (!inputVal) return;

    if (!currentUser) {
      onSignInTrigger();
      return;
    }

    try {
      const res = await fetch(`/api/activities/${itemId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ content: inputVal })
      });
      if (res.ok) {
        const updatedItem = await res.json();
        setFeedItems(prev => prev.map(item => item.id === itemId ? updatedItem : item));
        setCommentInputs(prev => ({ ...prev, [itemId]: '' }));
        if (showToast) {
          showToast('Comment published to PostgreSQL feed!', 'success');
        }
      }
    } catch (err) {
      console.error('Error commenting on activity:', err);
    }
  };

  // Create real status/discussion post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onSignInTrigger();
      return;
    }
    if (!newPostText.trim()) {
      if (showToast) showToast('Please write some content to share.', 'info');
      return;
    }

    setIsSubmittingPost(true);
    try {
      let animeTitle = '';
      let animeImage = '';
      if (newPostAnimeId > 0) {
        const watchEntry = watchList.find(entry => entry.anime.mal_id === newPostAnimeId);
        if (watchEntry) {
          animeTitle = watchEntry.anime.english_title || watchEntry.anime.title;
          animeImage = watchEntry.anime.image;
        } else {
          const animeObj = animeList.find(a => a.mal_id === newPostAnimeId);
          if (animeObj) {
            animeTitle = animeObj.english_title || animeObj.title;
            animeImage = animeObj.image;
          }
        }
      }

      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          type: newPostType,
          animeId: newPostAnimeId,
          animeTitle,
          animeImage,
          details: newPostType === 'review' && newPostAnimeId > 0
            ? `Rated ${newPostRating}/10 ★ • ${newPostText}`
            : newPostText
        })
      });

      if (res.ok) {
        setNewPostText('');
        setNewPostAnimeId(0);
        setIsExpanded(false);
        if (showToast) {
          showToast('Published update directly to PostgreSQL!', 'success');
        }
        await fetchFeed();
      } else {
        const errorData = await res.json();
        console.error('Failed to create post:', errorData.error);
      }
    } catch (err) {
      console.error('Error publishing post:', err);
    } finally {
      setIsSubmittingPost(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" id="activity-feed-root">
      
      {/* Unified Social Timeline */}
      <div className="space-y-6">
        
        {/* Interactive Discussion, Review, & Status Update Form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex gap-3">
            <AvatarDisplay id={currentUser?.avatar || 'otaku'} className="h-10 w-10 text-sm border border-zinc-850 shrink-0" />
            <div className="flex-1 space-y-3">
              <textarea
                value={newPostText}
                onChange={(e) => {
                  setNewPostText(e.target.value);
                  if (!isExpanded) setIsExpanded(true);
                }}
                onFocus={() => {
                  if (!currentUser) {
                    onSignInTrigger();
                  } else {
                    setIsExpanded(true);
                  }
                }}
                placeholder={currentUser ? `What's on your mind, ${currentUser.username}? Write a discussion, rating, or review...` : "Sign in to post real updates and discussions..."}
                className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-700/60 focus:border-indigo-500/40 rounded-2xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-all resize-none min-h-[48px]"
                rows={isExpanded ? 3 : 1}
              />
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && currentUser && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden border-t border-zinc-850/60 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Meta options row */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Select post type */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">Post Type</label>
                    <select
                      value={newPostType}
                      onChange={(e) => setNewPostType(e.target.value as any)}
                      className="bg-zinc-950 border border-zinc-850 text-[10px] rounded-lg px-2 py-1 text-zinc-300 font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="discussion">💬 Discussion</option>
                      <option value="review">📝 Review</option>
                      <option value="recommendation">💡 Recommendation</option>
                      <option value="question">❓ Question</option>
                      <option value="spoiler">⚠️ Spoiler (Blurred)</option>
                    </select>
                  </div>

                  {/* Rating score (if review) */}
                  {newPostType === 'review' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">Score</label>
                      <select
                        value={newPostRating}
                        onChange={(e) => setNewPostRating(Number(e.target.value))}
                        className="bg-zinc-950 border border-zinc-850 text-[10px] rounded-lg px-2.5 py-1 text-amber-400 font-bold focus:outline-none cursor-pointer"
                      >
                        {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>{n}/10 ★</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Attach anime from watchboard */}
                  <div className="flex flex-col gap-1 max-w-[160px]">
                    <label className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">Attach Anime</label>
                    <select
                      value={newPostAnimeId}
                      onChange={(e) => setNewPostAnimeId(Number(e.target.value))}
                      className="bg-zinc-950 border border-zinc-850 text-[10px] rounded-lg px-2 py-1 text-zinc-300 truncate focus:outline-none cursor-pointer max-w-full"
                    >
                      <option value={0}>-- None --</option>
                      {watchList.map((entry) => (
                        <option key={entry.anime.mal_id} value={entry.anime.mal_id}>
                          {entry.anime.english_title || entry.anime.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      setNewPostText('');
                      setIsExpanded(false);
                    }}
                    className="text-[10px] font-bold text-zinc-500 hover:text-zinc-350 px-3 py-2 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePost}
                    disabled={isSubmittingPost || !newPostText.trim()}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] px-4 py-2 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg disabled:opacity-40"
                  >
                    {isSubmittingPost ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <span>Publish</span>
                        <Send className="h-3 w-3" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Feed Posts */}
        <div className="space-y-5">
          {isLoading && feedItems.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
          ) : feedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-zinc-800 bg-zinc-900/10 rounded-3xl text-center p-8 space-y-4 animate-fade-in">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed max-w-sm mx-auto">
                The community is waiting for its first posts! Create an account or sign in to be the first to share an update, start a watchlist, or write a review.
              </p>
            </div>
          ) : (
            feedItems.map((item) => {
              const hasLiked = currentUser && item.likedBy.includes(currentUser.id);
              const formattedTime = new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              return (
                <motion.div
                  key={item.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 hover:border-zinc-800/80 transition-all shadow-xl"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <AvatarDisplay id={item.userAvatar} className="h-11 w-11 text-sm border border-zinc-800" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold font-display text-zinc-100 flex items-center gap-1.5 flex-wrap">
                          {item.username}
                          <span className={`text-[9px] font-bold font-sans border px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            item.type === 'discussion' ? 'border-indigo-500/15 text-indigo-400 bg-indigo-500/10' :
                            item.type === 'review' || item.type === 'rate_anime' ? 'border-emerald-500/15 text-emerald-400 bg-emerald-500/10' :
                            item.type === 'recommendation' || item.type === 'recommend_anime' ? 'border-violet-500/15 text-violet-400 bg-violet-500/10' :
                            item.type === 'question' ? 'border-amber-500/15 text-amber-400 bg-amber-500/10' :
                            item.type === 'spoiler' ? 'border-rose-500/15 text-rose-400 bg-rose-500/10' :
                            item.type === 'start_watching' ? 'border-zinc-700 text-zinc-400 bg-zinc-800/40' :
                            item.type === 'finish_watching' ? 'border-pink-500/15 text-pink-400 bg-pink-500/10' :
                            'border-zinc-700 text-zinc-400 bg-zinc-800/40'
                          }`}>
                            {item.type === 'discussion' && '💬 Discussion'}
                            {(item.type === 'review' || item.type === 'rate_anime') && '📝 Review'}
                            {(item.type === 'recommendation' || item.type === 'recommend_anime') && '💡 Recommend'}
                            {item.type === 'question' && '❓ Question'}
                            {item.type === 'spoiler' && '⚠️ Spoiler'}
                            {item.type === 'start_watching' && '🔥 Started watching'}
                            {item.type === 'finish_watching' && '🌸 Completed'}
                            {item.type === 'add_favorite' && '📌 Plan-to-watch'}
                            {!['discussion', 'review', 'rate_anime', 'recommendation', 'recommend_anime', 'question', 'spoiler', 'start_watching', 'finish_watching', 'add_favorite'].includes(item.type) && item.type}
                          </span>
                        </h4>
                        <p className="text-[9px] text-zinc-500 font-mono mt-0.5">{formattedTime} • Verified User Activity</p>
                      </div>
                    </div>
                  </div>

                  {/* Post Details (Custom discussion text) */}
                  {(!item.animeId || item.animeId === 0) && item.details && (
                    <div className="bg-zinc-950/25 border border-zinc-850 p-4 rounded-2xl">
                      {item.type === 'spoiler' ? (
                        <SpoilerContainer text={item.details} />
                      ) : (
                        <p className="text-xs sm:text-sm text-zinc-350 leading-relaxed whitespace-pre-wrap">
                          {item.details}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Post Body: Anime Metadata Card */}
                  {item.animeId > 0 && (() => {
                    const cached = getCachedAnime(item.animeId);
                    const resolvedAnime = cached || {
                      mal_id: item.animeId,
                      title: item.animeTitle,
                      english_title: item.animeTitle,
                      genres: [],
                      synopsis: '',
                      score: 8.5,
                      popularity: 100,
                      type: 'TV',
                      episodes: 12,
                      status: 'Finished',
                      year: 2024,
                      studio: 'N/A',
                      image: item.animeImage
                    };
                    return (
                      <div 
                        onClick={() => onSelectAnime(resolvedAnime)}
                        className="bg-zinc-950/40 hover:bg-zinc-950/60 border border-zinc-850 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 cursor-pointer transition-all group"
                      >
                        {item.animeImage && (
                          <img
                            src={item.animeImage}
                            alt={item.animeTitle}
                            className="h-20 w-14 rounded-xl object-cover shrink-0 bg-zinc-900 group-hover:scale-[1.03] transition-transform duration-150 border border-zinc-850 self-center sm:self-auto"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <span className="text-[9px] font-bold text-zinc-400 bg-zinc-800 border border-zinc-700/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {item.animeTitle}
                          </span>
                          <p className="text-xs sm:text-sm text-zinc-250 leading-relaxed font-sans italic pt-1 whitespace-pre-wrap">
                            "{item.details || 'Check out recommendations and complete staff notes for this title.'}"
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Like & Comment counts */}
                  <div className="flex items-center gap-6 border-t border-b border-zinc-850 py-3 text-xs text-zinc-500 font-semibold">
                    <button
                      onClick={() => handleLike(item.id)}
                      className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                        hasLiked ? 'text-rose-500' : 'hover:text-rose-400 text-zinc-500'
                      }`}
                    >
                      <Heart className={`h-4.5 w-4.5 ${hasLiked ? 'fill-current' : ''}`} />
                      <span>{item.likesCount || 0} Likes</span>
                    </button>

                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <MessageCircle className="h-4.5 w-4.5" />
                      <span>{item.comments?.length || 0} Comments</span>
                    </div>
                  </div>

                  {/* Comments List */}
                  {item.comments && item.comments.length > 0 && (
                    <div className="space-y-3 bg-zinc-950/30 p-3 rounded-2xl border border-zinc-850/60 max-h-[220px] overflow-y-auto">
                      {item.comments.map(c => (
                        <div key={c.id} className="flex gap-2.5 items-start text-xs text-zinc-400 leading-relaxed">
                          <AvatarDisplay id={c.userAvatar} className="h-6 w-6 text-[10px] border border-zinc-850 shrink-0" />
                          <div className="bg-zinc-900 rounded-xl p-2.5 flex-1 relative">
                            <span className="font-bold text-zinc-200 block text-[10px] mb-0.5">{c.username}</span>
                            <p className="text-[11px] text-zinc-300 leading-normal">{c.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comment Input Bar */}
                  <form onSubmit={e => handleComment(e, item.id)} className="flex items-center gap-2 pt-1">
                    <AvatarDisplay id={currentUser?.avatar || 'otaku'} className="h-7 w-7 text-xs border border-zinc-800" />
                    <input
                      type="text"
                      value={commentInputs[item.id] || ''}
                      onChange={e => setCommentInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="Write a comment..."
                      className="flex-1 rounded-xl bg-zinc-950 border border-zinc-850 focus:border-indigo-500/40 py-2 px-3 text-xs text-zinc-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                    <button
                      type="submit"
                      className="p-2 rounded-xl bg-zinc-850 hover:bg-zinc-750 text-indigo-400 transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>

                </motion.div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
