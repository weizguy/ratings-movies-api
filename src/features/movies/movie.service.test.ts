import { createMovieService } from './movie.service';
import type { MovieRepository } from './movie.repository';
import { NotFoundError } from '../../common/errors';

const fakeRepo = (overrides: Partial<MovieRepository> = {}): MovieRepository => ({
  findAll: jest.fn(),
  findByYear: jest.fn(),
  findByGenre: jest.fn(),
  findByImdbId: jest.fn().mockResolvedValue(null),
  getAverageRating: jest.fn().mockResolvedValue(null),
  ...overrides,
});

it('throws NotFoundError for an unknown imdbId', async () => {
  const service = createMovieService(fakeRepo());
  await expect(service.details('tt0000000')).rejects.toBeInstanceOf(NotFoundError);
});

it('normalizes genre slugs before querying', async () => {
  const findByGenre = jest.fn().mockResolvedValue({ rows: [], total: 0 });
  const service = createMovieService(fakeRepo({ findByGenre }));
  await service.byGenre('Science-Fiction', 1);
  expect(findByGenre).toHaveBeenCalledWith('science fiction', { limit: 50, offset: 0 });
});