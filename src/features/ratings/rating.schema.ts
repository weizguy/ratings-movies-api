import { sqliteTable, integer, real } from 'drizzle-orm/sqlite-core';

export const ratings = sqliteTable('ratings', {
  ratingId: integer('ratingId').primaryKey(),
  userId: integer('userId').notNull(),
  movieId: integer('movieId').notNull(),
  rating: real('rating').notNull(),
  timestamp: integer('timestamp').notNull(),
});