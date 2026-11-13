// src/features/movies/movie.service.test.ts
import { createMovieService, normalizeGenre, type RatingsReader } from './movie.service';
import type { MovieRepository, MovieRow } from './movie.repository';
import { NotFoundError } from '../../common/errors';

const fakeRepo = (overrides: Partial<MovieRepository> = {}): MovieRepository => ({
  findAll: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
  findByYear: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
  findByGenre: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
  findByImdbId: jest.fn().mockResolvedValue(null),
  ...overrides,
});

const fakeRatings = (average: number | null = null): RatingsReader => ({
  getAverageForMovie: jest.fn().mockResolvedValue(average),
});

const movieRow: MovieRow = {
  movieId: 5,
  imdbId: 'tt0113101',
  title: 'Four Rooms',
  overview: 'A bellhop’s first night on the job.',
  productionCompanies: '[{"name": "Miramax Films", "id": 14}]',
  releaseDate: '1995-12-09',
  budget: 4000000,
  revenue: 4300000,
  runtime: 98,
  language: null,
  genres: '[{"id": 80, "name": "Crime"}, {"id": 35, "name": "Comedy"}]',
  status: 'Released',
};

describe('normalizeGenre', () => {
  it.each([
    ['Science-Fiction', 'science fiction'],
    ['  DRAMA ', 'drama'],
    ['TV Movie', 'tv movie'],
  ])('normalizes %p to %p', (input, expected) => {
    expect(normalizeGenre(input)).toBe(expected);
  });
});

describe('MovieService.details', () => {
  it('throws NotFoundError for an unknown imdbId', async () => {
    const service = createMovieService(fakeRepo(), fakeRatings());
    await expect(service.details('tt0000000')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('looks up ratings by internal movieId and maps the result', async () => {
    const ratings = fakeRatings(3.456);
    const repo = fakeRepo({ findByImdbId: jest.fn().mockResolvedValue(movieRow) });
    const service = createMovieService(repo, ratings);

    const result = await service.details('tt0113101');

    expect(ratings.getAverageForMovie).toHaveBeenCalledWith(5);
    expect(result).toMatchObject({
      imdbId: 'tt0113101',
      budget: '$4,000,000',
      averageRating: 3.46,
      genres: ['Crime', 'Comedy'],
      productionCompanies: ['Miramax Films'],
    });
  });

  it('returns null averageRating when a movie has no ratings', async () => {
    const repo = fakeRepo({ findByImdbId: jest.fn().mockResolvedValue(movieRow) });
    const service = createMovieService(repo, fakeRatings(null));

    expect((await service.details('tt0113101')).averageRating).toBeNull();
  });
});

describe('MovieService paging', () => {
  it('normalizes genre slugs before querying', async () => {
    const findByGenre = jest.fn().mockResolvedValue({ rows: [], total: 0 });
    const service = createMovieService(fakeRepo({ findByGenre }), fakeRatings());

    await service.byGenre('Science-Fiction', 1);

    expect(findByGenre).toHaveBeenCalledWith('science fiction', { limit: 50, offset: 0 });
  });

  it('converts page number to offset and builds pagination metadata', async () => {
    const findAll = jest.fn().mockResolvedValue({ rows: [], total: 120 });
    const service = createMovieService(fakeRepo({ findAll }), fakeRatings());

    const result = await service.list(3);

    expect(findAll).toHaveBeenCalledWith({ limit: 50, offset: 100 });
    expect(result.pagination).toEqual({ page: 3, pageSize: 50, total: 120, totalPages: 3 });
  });
});