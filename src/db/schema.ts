import { pgTable, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Firebase Auth UID
  username: text('username').notNull(),
  email: text('email').notNull(),
  avatar: text('avatar').notNull().default('cyber'),
  favoriteGenres: jsonb('favorite_genres').$type<string[]>().default([]),
  recentlyViewedIds: jsonb('recently_viewed_ids').$type<number[]>().default([]),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  bio: text('bio'),
  banner: text('banner'),
  favoriteStudios: jsonb('favorite_studios').$type<string[]>().default([]),
  country: text('country'),
  language: text('language'),
  lastActive: timestamp('last_active').defaultNow(),
  onlineStatus: text('online_status').$type<'online' | 'idle' | 'offline'>().default('offline'),
  achievements: jsonb('achievements').default([]),
  badges: jsonb('badges').$type<string[]>().default([]),
  privacy: jsonb('privacy').default({
    profile: 'public',
    messages: 'all',
    requests: 'all',
    activity: 'public',
    onlineStatus: 'visible'
  }),
});

export const watchlists = pgTable('watchlists', {
  id: text('id').primaryKey(), // unique watchlist entry ID
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  anime: jsonb('anime').notNull(), // Full Anime object
  status: text('status').$type<'want_to_watch' | 'plan_to_watch' | 'watching' | 'completed' | 'dropped' | 'on_hold'>().notNull(),
  addedAt: timestamp('added_at').defaultNow().notNull(),
  priority: text('priority').$type<'low' | 'medium' | 'high'>().notNull().default('medium'),
  userRating: integer('user_rating'),
});

export const connections = pgTable('connections', {
  id: text('id').primaryKey(),
  userOneId: text('user_one_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  userTwoId: text('user_two_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: text('status').$type<'pending_one_to_two' | 'pending_two_to_one' | 'connected' | 'waved' | 'blocked_one_to_two' | 'blocked_two_to_one'>().notNull(),
  lastInteractionAt: timestamp('last_interaction_at').defaultNow().notNull(),
  mutedBy: jsonb('muted_by').$type<string[]>().default([]),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  senderId: text('sender_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  receiverId: text('receiver_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  animeCard: jsonb('anime_card'),
  emoji: text('emoji'),
});

export const activityFeed = pgTable('activity_feed', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  username: text('username').notNull(),
  userAvatar: text('user_avatar').notNull(),
  type: text('type').$type<'start_watching' | 'finish_watching' | 'rate_anime' | 'add_favorite' | 'recommend_anime'>().notNull(),
  animeId: integer('anime_id').notNull(),
  animeTitle: text('anime_title').notNull(),
  animeImage: text('anime_image').notNull(),
  details: text('details'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  likesCount: integer('likes_count').default(0).notNull(),
  likedBy: jsonb('liked_by').$type<string[]>().default([]),
  comments: jsonb('comments').default([]),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(), // Target user who receives it
  type: text('type').$type<'connect_request' | 'connect_accept' | 'new_message' | 'friend_finish' | 'friend_recommend'>().notNull(),
  senderId: text('sender_id').notNull(),
  senderName: text('sender_name').notNull(),
  senderAvatar: text('sender_avatar').notNull(),
  animeId: integer('anime_id'),
  animeTitle: text('anime_title'),
  message: text('message'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  isRead: boolean('is_read').default(false).notNull(),
});
