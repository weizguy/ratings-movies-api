import { NotFoundError } from '../../common/errors';
import {
  paginate,
  toPageQuery,
  type PageRequest,
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

export function createMovieService(movieRepo: MovieRepository, ratingsReader: RatingsReader) {
 
  async function toPage(
    fetch: (query: PageQuery) => Promise<PagedRows>,
    { page, pageSize }: PageRequest,
  ): Promise<Paginated<MovieSummary>> {
    const { rows, total } = await fetch(toPageQuery(page, pageSize));
    return paginate(rows.map(toMovieSummary), total, page, pageSize);
  }

  return {
    list(req: PageRequest) {
      return toPage((q) => movieRepo.findAll(q), req);
    },
    byYear(year: number, sort: SortOrder, req: PageRequest) {
      return toPage((q) => movieRepo.findByYear(year, sort, q), req);
    },
    byGenre(genre: string, req: PageRequest) {
      return toPage((q) => movieRepo.findByGenre(normalizeGenre(genre), q), req);
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