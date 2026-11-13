import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

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