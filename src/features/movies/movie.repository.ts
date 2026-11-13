import type { Pool } from 'pg';
import type { PageQuery } from '../../common/pagination';

export interface MovieRow {
  movieId: number;
  imdbId: string;
  title: string;
  overview: string | null;
  productionCompanies: string | null; // JSON text, parsed by the mapper
  releaseDate: string | null;
  budget: number | null;
  revenue: number | null;
  runtime: number | null;
  language: string | null;
  genres: string | null;              // JSON text, parsed by the mapper
  status: string | null;
}

export type MovieListRow = Pick<MovieRow, 'imdbId' | 'title' | 'genres' | 'releaseDate' | 'budget'>;
export type SortOrder = 'asc' | 'desc';
export interface PagedRows { rows: MovieListRow[]; total: number; }

// Aliases map snake_case columns to the camelCase shape the mapper expects.
// ::text keeps JSONB as JSON strings, so the mapper is unchanged.
const LIST_COLUMNS = `
  imdb_id AS "imdbId", title, genres::text AS genres,
  release_date AS "releaseDate", budget`;

const DETAIL_COLUMNS = `
  movie_id AS "movieId", imdb_id AS "imdbId", title, overview,
  production_companies::text AS "productionCompanies",
  release_date AS "releaseDate", budget, revenue, runtime, language,
  genres::text AS genres, status`;

export function createMovieRepository(pool: Pool) {
  /**
   * `where` and `orderBy` are internal constants, never user input.
   * All user-supplied values go through `params` as bound parameters.
   */
  async function findPage(
    where: string,
    params: unknown[],
    orderBy: string,
    page: PageQuery,
  ): Promise<PagedRows> {
    const whereSql = where ? `WHERE ${where}` : '';
    const limitIdx = params.length + 1;

    const [countResult, rowsResult] = await Promise.all([
      pool.query<{ total: number }>(
        `SELECT count(*)::int AS total FROM movies.movies ${whereSql}`,
        params,
      ),
      pool.query<MovieListRow>(
        `SELECT ${LIST_COLUMNS} FROM movies.movies ${whereSql}
         ORDER BY ${orderBy}
         LIMIT $${limitIdx} OFFSET $${limitIdx + 1}`,
        [...params, page.limit, page.offset],
      ),
    ]);

    return { rows: rowsResult.rows, total: countResult.rows[0].total };
  }

  return {
    findAll(page: PageQuery): Promise<PagedRows> {
      return findPage('', [], 'movie_id', page);
    },

    findByYear(year: number, sort: SortOrder, page: PageQuery): Promise<PagedRows> {
      const direction = sort === 'desc' ? 'DESC' : 'ASC'; // whitelisted, safe to inline
      return findPage(
        'release_date >= make_date($1, 1, 1) AND release_date < make_date($2, 1, 1)',
        [year, year + 1],
        `release_date ${direction}, movie_id`,
        page,
      );
    },

    /** Expects a normalized (lowercase) genre. Uses the GIN index on genre_names. */
    findByGenre(genre: string, page: PageQuery): Promise<PagedRows> {
      return findPage('genre_names @> ARRAY[$1]::text[]', [genre], 'movie_id', page);
    },

    async findByImdbId(imdbId: string): Promise<MovieRow | null> {
      const result = await pool.query<MovieRow>(
        `SELECT ${DETAIL_COLUMNS} FROM movies.movies WHERE imdb_id = $1`,
        [imdbId],
      );
      return result.rows[0] ?? null;
    },
  };
}

export type MovieRepository = ReturnType<typeof createMovieRepository>;