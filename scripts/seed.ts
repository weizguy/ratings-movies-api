import { DatabaseSync } from 'node:sqlite';
import { Pool, type PoolClient } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const BATCH_SIZE = 1000;

const toJson = (raw: string | null): string | null => {
  if (!raw) return null;
  try { return JSON.stringify(JSON.parse(raw)); } catch { return null; }
};

/** SQLite allows '' in numeric columns; Postgres doesn't. Empty or invalid → NULL. */
const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  
  /** Only accept real YYYY-MM-DD dates; anything else → NULL. */
  const toDate = (value: unknown): string | null =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

const toGenreNames = (raw: string | null): string[] => {
  try {
    const parsed = JSON.parse(raw ?? '[]') as Array<{ name?: unknown }>;
    return parsed
      .map((g) => (typeof g.name === 'string' ? g.name.toLowerCase() : null))
      .filter((n): n is string => n !== null);
  } catch {
    return [];
  }
};

async function insertBatches(client: PoolClient, insertSql: string, rows: unknown[][]) {
  const columns = rows[0]?.length ?? 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const placeholders = batch
      .map((_, r) => `(${Array.from({ length: columns }, (_, c) => `$${r * columns + c + 1}`).join(', ')})`)
      .join(', ');
    await client.query(`${insertSql} VALUES ${placeholders}`, batch.flat());
  }
}

async function main() {
  const moviesDb = new DatabaseSync('db/movies.db');
  const ratingsDb = new DatabaseSync('db/ratings.db');

  const movieRows = (moviesDb.prepare('SELECT * FROM movies').all() as Record<string, any>[]).map((m) => [
    m.movieId, m.imdbId, m.title, m.overview,
    toJson(m.productionCompanies),
    toDate(m.releaseDate),
    toNumber(m.budget), toNumber(m.revenue), toNumber(m.runtime),
    m.language,
    toJson(m.genres), toGenreNames(m.genres), m.status,
  ]);

  const ratingRows = (ratingsDb.prepare('SELECT * FROM ratings').all() as Record<string, any>[]).map((r) => [
    r.ratingId, r.userId, r.movieId, r.rating, r.timestamp,
  ]);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE movies.movies, ratings.ratings');
    await insertBatches(client,
      `INSERT INTO movies.movies (movie_id, imdb_id, title, overview, production_companies,
        release_date, budget, revenue, runtime, language, genres, genre_names, status)`,
      movieRows);
    await insertBatches(client,
      `INSERT INTO ratings.ratings (rating_id, user_id, movie_id, rating, "timestamp")`,
      ratingRows);
    await client.query('COMMIT');
    console.log(`Seeded ${movieRows.length} movies and ${ratingRows.length} ratings`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });