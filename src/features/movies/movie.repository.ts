// src/features/movies/movie.repository.ts
import { and, asc, count, desc, eq, gte, lt, sql, type SQL } from 'drizzle-orm';
import type { moviesDb } from '../../database';
import type { PageQuery } from '../../common/pagination';
import { movies } from './movie.schema';

type MoviesDb = typeof moviesDb;

export type MovieRow = typeof movies.$inferSelect;
export type MovieListRow = Pick<MovieRow, 'imdbId' | 'title' | 'genres' | 'releaseDate' | 'budget'>;
export type SortOrder = 'asc' | 'desc';

export interface PagedRows {
  rows: MovieListRow[];
  total: number;
}

// Columns returned by every list endpoint
const listColumns = {
  imdbId: movies.imdbId,
  title: movies.title,
  genres: movies.genres,
  releaseDate: movies.releaseDate,
  budget: movies.budget,
};

export function createMovieRepository(db: MoviesDb) {
  /**
   * Shared paged query: total count plus one page of rows.
   * Every ordering ends with movieId so pages are stable across requests.
   */
  async function findPage(
    where: SQL | undefined,
    orderBy: SQL[],
    page: PageQuery,
  ): Promise<PagedRows> {
    const [{ total }] = await db
      .select({ total: count() })
      .from(movies)
      .where(where);

    const rows = await db
      .select(listColumns)
      .from(movies)
      .where(where)
      .orderBy(...orderBy)
      .limit(page.limit)
      .offset(page.offset);

    return { rows, total };
  }

  return {
    findAll(page: PageQuery): Promise<PagedRows> {
      return findPage(undefined, [asc(movies.movieId)], page);
    },

    /** Range filter (not LIKE) so an index on releaseDate could be used. */
    findByYear(year: number, sort: SortOrder, page: PageQuery): Promise<PagedRows> {
      const direction = sort === 'desc' ? desc : asc;
      return findPage(
        and(
          gte(movies.releaseDate, `${year}-01-01`),
          lt(movies.releaseDate, `${year + 1}-01-01`),
        ),
        [direction(movies.releaseDate), asc(movies.movieId)],
        page,
      );
    },

    /**
     * Genres are stored as JSON text: [{"id": 18, "name": "Drama"}].
     * Expects an already-normalized (lowercase, spaces) genre; the value is
     * bound as a parameter by Drizzle's sql template, not interpolated.
     */
    findByGenre(genre: string, page: PageQuery): Promise<PagedRows> {
      return findPage(
        sql`exists (
          select 1
          from json_each(${movies.genres})
          where lower(json_extract(json_each.value, '$.name')) = ${genre}
        )`,
        [asc(movies.movieId)],
        page,
      );
    },

    async findByImdbId(imdbId: string): Promise<MovieRow | null> {
      const row = await db
        .select()
        .from(movies)
        .where(eq(movies.imdbId, imdbId))
        .get();
      return row ?? null;
    },
  };
}

export type MovieRepository = ReturnType<typeof createMovieRepository>;