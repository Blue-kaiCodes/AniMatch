export interface Anime {
  mal_id: number;
  title: string;
  english_title: string;
  native_title?: string;
  synonyms?: string[];
  genres: string[];
  synopsis: string;
  score: number;
  popularity: number;
  type: string;
  episodes: number;
  status: string;
  year: number;
  studio: string;
  image: string;
  format?: string;
  season?: string;
  source?: string;
  duration?: string;
  rating?: string;
  
  // Dynamic live metadata:
  bannerImage?: string;
  trailer?: {
    id: string;
    site: string;
    embedUrl?: string;
  } | null;
  characters?: Array<{
    id: number;
    name: string;
    role: string;
    image: string;
    voiceActor?: {
      name: string;
      image: string;
    } | null;
  }>;
  relations?: Array<{
    mal_id: number;
    title: string;
    relationType: string;
    type: string;
    image: string;
  }>;
}

export interface RecommendationResponse {
  source: Anime;
  recommendations: (Anime & { similarity: number; finalScore: number })[];
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isRead?: boolean;
  animeCard?: Anime;
  emoji?: string;
  imageUrl?: string;
  isEdited?: boolean;
  reactions?: Record<string, string[]>; // emoji -> userIds who reacted
}

export interface WatchListEntry {
  anime: Anime;
  status: 'want_to_watch' | 'plan_to_watch' | 'watching' | 'completed' | 'dropped' | 'on_hold';
  addedAt: string;
  priority: 'low' | 'medium' | 'high';
  userRating?: number; // 1-10 scale
}

export type ActiveTab = 'discover' | 'browse' | 'trending' | 'watch_board' | 'profile' | 'fans' | 'friends' | 'feed';

export interface UserPrivacy {
  profile: 'public' | 'friends' | 'private';
  messages: 'all' | 'friends' | 'none';
  requests: 'all' | 'friends' | 'none';
  activity: 'public' | 'friends' | 'private';
  onlineStatus: 'visible' | 'hidden';
}

export interface FavoriteAnimeMeta {
  animeId: number;
  title: string;
  poster: string;
  mediaType: string;
  year: number;
}

export interface FavoriteStudioMeta {
  studioId: number;
  studioName: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  favoriteGenres: string[];
  recentlyViewedIds: number[];
  joinedAt: string;
  
  // Social expansions:
  bio?: string;
  banner?: string;
  favoriteStudios?: string[];
  country?: string;
  language?: string;
  displayName?: string;
  favoriteAnime?: string | FavoriteAnimeMeta;
  favoriteStudio?: string | FavoriteStudioMeta;
  lastActive?: string;
  onlineStatus?: 'online' | 'idle' | 'offline';
  achievements?: { id: string; name: string; description: string; icon: string; unlockedAt: string }[];
  badges?: string[];
  privacy?: UserPrivacy;
}

export interface Connection {
  id: string;
  userOneId: string;
  userTwoId: string;
  status: 'pending_one_to_two' | 'pending_two_to_one' | 'connected' | 'waved' | 'blocked_one_to_two' | 'blocked_two_to_one';
  lastInteractionAt: string;
  mutedBy?: string[]; // userIds who muted notifications
}

export interface ActivityFeedItem {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  type: 'start_watching' | 'finish_watching' | 'rate_anime' | 'add_favorite' | 'recommend_anime';
  animeId: number;
  animeTitle: string;
  animeImage: string;
  details?: string; // rating value, recommendation target, etc.
  timestamp: string;
  likesCount: number;
  likedBy: string[]; // userIds who liked it
  comments?: { id: string; userId: string; username: string; userAvatar: string; content: string; timestamp: string }[];
}

export interface NotificationItem {
  id: string;
  type: 'connect_request' | 'connect_accept' | 'new_message' | 'friend_finish' | 'friend_recommend' | 'like_post' | 'comment_post';
  senderId: string;
  senderName: string;
  senderAvatar: string;
  animeId?: number;
  animeTitle?: string;
  message?: string;
  timestamp: string;
  isRead: boolean;
}

