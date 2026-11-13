import { NotFoundError } from '../../common/errors';
import {
  DEFAULT_PAGE_SIZE,
  paginate,
  toPageQuery,
  type PageQuery,
  type Paginated,
} from '../../common/pagination';
import type { MovieRepository, PagedRows, SortOrder } from './movie.repository';
import {
  toMovieDetails,
  toMovieSummary,
  type MovieDetails,
  type MovieSummary,
} from './movie.mapper';

export interface RatingsReader {
  getAverageForMovie(movieId: number): Promise<number | null>;
}

/** "Science-Fiction" / "science fiction" / " SCIENCE FICTION " -> "science fiction" */
export const normalizeGenre = (raw: string): string =>
  raw.toLowerCase().replace(/-/g, ' ').trim();

export function createMovieService(
  movieRepo: MovieRepository,
  ratingsReader: RatingsReader,
  pageSize: number = DEFAULT_PAGE_SIZE,
) {
 
  async function toPage(
    fetch: (query: PageQuery) => Promise<PagedRows>,
    page: number,
  ): Promise<Paginated<MovieSummary>> {
    const { rows, total } = await fetch(toPageQuery(page, pageSize));
    return paginate(rows.map(toMovieSummary), total, page, pageSize);
  }

  return {
    list(page: number): Promise<Paginated<MovieSummary>> {
      return toPage((query) => movieRepo.findAll(query), page);
    },

    byYear(year: number, sort: SortOrder, page: number): Promise<Paginated<MovieSummary>> {
      return toPage((query) => movieRepo.findByYear(year, sort, query), page);
    },

    byGenre(genre: string, page: number): Promise<Paginated<MovieSummary>> {
      return toPage((query) => movieRepo.findByGenre(normalizeGenre(genre), query), page);
    },

    /** Looks up the movie by imdbId, then its ratings by the internal movieId. */
    async details(imdbId: string): Promise<MovieDetails> {
      const movie = await movieRepo.findByImdbId(imdbId);
      if (!movie) {
        throw new NotFoundError('Movie not found');
      }

      const averageRating = await ratingsReader.getAverageForMovie(movie.movieId);
      return toMovieDetails(movie, averageRating);
    },
  };
}

export type MovieService = ReturnType<typeof createMovieService>;