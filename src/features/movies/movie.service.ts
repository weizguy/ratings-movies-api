import { NotFoundError } from '../../common/errors';
import { DEFAULT_PAGE_SIZE, paginate, toPageQuery, type PageQuery } from '../../common/pagination';
import type { MovieRepository, PagedRows, SortOrder } from './movie.repository';
import { toMovieDetails, toMovieSummary } from './movie.mapper';

export const normalizeGenre = (raw: string) => raw.toLowerCase().replace(/-/g, ' ').trim();

export function createMovieService(repo: MovieRepository, pageSize = DEFAULT_PAGE_SIZE) {
  async function toPage(fetch: (q: PageQuery) => Promise<PagedRows>, page: number) {
    const { rows, total } = await fetch(toPageQuery(page, pageSize));
    return paginate(rows.map(toMovieSummary), total, page, pageSize);
  }

  return {
    list: (page: number) => toPage((q) => repo.findAll(q), page),

    byYear: (year: number, sort: SortOrder, page: number) =>
      toPage((q) => repo.findByYear(year, sort, q), page),

    byGenre: (genre: string, page: number) =>
      toPage((q) => repo.findByGenre(normalizeGenre(genre), q), page),

    async details(imdbId: string) {
      const movie = await repo.findByImdbId(imdbId);
      if (!movie) throw new NotFoundError('Movie not found');
      const averageRating = await repo.getAverageRating(movie.movieId);
      return toMovieDetails(movie, averageRating);
    },
  };
}

export type MovieService = ReturnType<typeof createMovieService>;