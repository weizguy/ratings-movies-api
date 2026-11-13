import { and, asc, avg, count, desc, eq, gte, lt, sql, type SQL } from 'drizzle-orm';
import type { moviesDb, ratingsDb } from '../../database';
import { movies, ratings } from './movie.schema';
import type { PageQuery } from '../../common/pagination';

type MoviesDb = typeof moviesDb;
type RatingsDb = typeof ratingsDb;

export type MovieRow = typeof movies.$inferSelect;
export type MovieListRow = Pick<MovieRow, 'imdbId' | 'title' | 'genres' | 'releaseDate' | 'budget'>;
export type SortOrder = 'asc' | 'desc';
export interface PagedRows { rows: MovieListRow[]; total: number; }

const listColumns = {
  imdbId: movies.imdbId,
  title: movies.title,
  genres: movies.genres,
  releaseDate: movies.releaseDate,
  budget: movies.budget,
};

export function createMovieRepository(moviesDb: MoviesDb, ratingsDb: RatingsDb) {
  async function findPage(where: SQL | undefined, orderBy: SQL[], page: PageQuery): Promise<PagedRows> {
    const [{ total }] = await moviesDb.select({ total: count() }).from(movies).where(where);
    const rows = await moviesDb
      .select(listColumns)
      .from(movies)
      .where(where)
      .orderBy(...orderBy)
      .limit(page.limit)
      .offset(page.offset);
    return { rows, total };
  }

  return {
    findAll: (page: PageQuery) =>
      findPage(undefined, [asc(movies.movieId)], page),

    findByYear: (year: number, sort: SortOrder, page: PageQuery) =>
      findPage(
        and(gte(movies.releaseDate, `${year}-01-01`), lt(movies.releaseDate, `${year + 1}-01-01`)),
        [(sort === 'desc' ? desc : asc)(movies.releaseDate), asc(movies.movieId)],
        page,
      ),

    findByGenre: (genre: string, page: PageQuery) =>
      findPage(
        sql`exists (
          select 1 from json_each(${movies.genres})
          where lower(json_extract(json_each.value, '$.name')) = ${genre}
        )`,
        [asc(movies.movieId)],
        page,
      ),

    findByImdbId: async (imdbId: string): Promise<MovieRow | null> =>
      (await moviesDb.select().from(movies).where(eq(movies.imdbId, imdbId)).get()) ?? null,

    getAverageRating: async (movieId: number): Promise<number | null> => {
      const row = await ratingsDb
        .select({ avg: avg(ratings.rating) })
        .from(ratings)
        .where(eq(ratings.movieId, movieId))
        .get();
      return row?.avg != null ? Number(row.avg) : null;
    },
  };
}

export type MovieRepository = ReturnType<typeof createMovieRepository>;