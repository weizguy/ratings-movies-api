import { pool } from '../../database';
import { createRatingRepository } from '../ratings/rating.repository';
import { createMovieRepository } from './movie.repository';
import { createMovieService } from './movie.service';
import { createMovieController } from './movie.controller';
import { createMovieRouter } from './movie.routes';

export function createMoviesFeature() {
    const movieRepository = createMovieRepository(pool);
    const ratingRepository = createRatingRepository(pool);
  
    const movieService = createMovieService(movieRepository, ratingRepository);
    const movieController = createMovieController(movieService);
  
    return createMovieRouter(movieController);
}