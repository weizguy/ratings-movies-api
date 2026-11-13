import { Router } from 'express';
import type { MovieController } from './movie.controller';

export function createMovieRouter(controller: MovieController): Router {
  const router = Router();
  router.get('/movies', controller.list);
  router.get('/movies/year/:year', controller.byYear);
  router.get('/movies/genre/:genre', controller.byGenre);
  router.get('/movies/:imdbId', controller.details);
  return router;
}