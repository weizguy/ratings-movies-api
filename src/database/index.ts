import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as movieSchema from '../features/movies/movie.schema';

const appSchema = {
  ...movieSchema,
  // Future features
};

const moviesFile = new Database('db/movies.db');
const ratingsFile = new Database('db/ratings.db');

export const moviesDb = drizzle(moviesFile, { schema: appSchema });
export const ratingsDb = drizzle(ratingsFile, { schema: appSchema });