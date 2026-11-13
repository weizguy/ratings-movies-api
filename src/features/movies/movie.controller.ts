import type { Request, Response } from 'express';
import { BadRequestError } from '../../common/errors';
import { parsePageRequest } from '../../common/pagination';
import type { MovieService } from './movie.service';

export function createMovieController(service: MovieService) {
  return {
    list: async (req: Request, res: Response) => {
      res.json(await service.list(parsePageRequest(req.query)));
    },

    byYear: async (req: Request<{ year: string }>, res: Response) => {
      const { year } = req.params;
      if (!/^\d{4}$/.test(year)) throw new BadRequestError('Year must be a 4-digit number, e.g. 1995');
      const sort = String(req.query.order ?? 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
      res.json(await service.byYear(Number(year), sort, parsePageRequest(req.query)));
    },

    byGenre: async (req: Request<{ genre: string }>, res: Response) => {
      res.json(await service.byGenre(req.params.genre, parsePageRequest(req.query)));
    },

    details: async (req: Request<{ imdbId: string }>, res: Response) => {
      res.json(await service.details(req.params.imdbId));
    },
  };
}

export type MovieController = ReturnType<typeof createMovieController>;