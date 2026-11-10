import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// Maps to db/movies.db
export const movies = sqliteTable('movies', {
  movieId: integer('movieId').primaryKey(),
  imdbId: text('imdbId').notNull(),
  title: text('title').notNull(),
  overview: text('overview'),
  productionCompanies: text('productionCompanies'),
  releaseDate: text('releaseDate'),
  budget: integer('budget'),
  revenue: integer('revenue'),
  runtime: real('runtime'),
  language: text('language'),
  genres: text('genres'),
  status: text('status'),
});

// Maps to db/ratings.db
export const ratings = sqliteTable('ratings', {
  ratingId: integer('ratingId').primaryKey(),
  userId: integer('userId').notNull(),
  movieId: integer('movieId').notNull(),
  rating: real('rating').notNull(),
  timestamp: integer('timestamp').notNull(),
});