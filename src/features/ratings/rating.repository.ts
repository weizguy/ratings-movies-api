import { avg, eq } from 'drizzle-orm';
import type { ratingsDb } from '../../database';
import { ratings } from './rating.schema'; 

export function createRatingRepository(db: typeof ratingsDb) {
  return {
    getAverageForMovie: async (movieId: number): Promise<number | null> => {
      const row = await db
        .select({ avg: avg(ratings.rating) })
        .from(ratings)
        .where(eq(ratings.movieId, movieId))
        .get();
      return row?.avg != null ? Number(row.avg) : null;
    },
  };
}

export type RatingRepository = ReturnType<typeof createRatingRepository>;