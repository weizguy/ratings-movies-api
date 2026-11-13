import type { Pool } from 'pg';

export function createRatingRepository(pool: Pool) {
  return {
    async getAverageForMovie(movieId: number): Promise<number | null> {
      const result = await pool.query<{ avg: number | null }>(
        'SELECT avg(rating)::float8 AS avg FROM ratings.ratings WHERE movie_id = $1',
        [movieId],
      );
      return result.rows[0]?.avg ?? null;
    },
  };
}

export type RatingRepository = ReturnType<typeof createRatingRepository>;