import { moviesDb, ratingsDb } from '../../database';
import { createMovieRepository } from './movie.repository';
import { createMovieService } from './movie.service';
import { createMovieController } from './movie.controller';
import { createMovieRouter } from './movie.routes';

export function createMoviesFeature() {
  const repository = createMovieRepository(moviesDb, ratingsDb);
  const service = createMovieService(repository);
  return createMovieRouter(createMovieController(service));
}