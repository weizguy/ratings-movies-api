import express from 'express';
import { eq, avg, asc, desc, sql, like, count } from 'drizzle-orm';
import { moviesDb, ratingsDb } from '../../database'; 
import { movies, ratings } from './movie.schema';

const router = express.Router();
const ITEMS_PER_PAGE = 50;

// ==========================================
// HELPERS
// ==========================================
  
const formatCurrency = (value: number | null): string | null => {
  if (value === null || value === 0 || isNaN(value)) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
};

const parseJsonField = (jsonString: string | null): string[] => {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => item.name || item).filter(Boolean);
    }
  } catch (e) {
    console.error("Failed to parse JSON column:", e);
  }
  return [];
};

const formatMovieList = (movieRows: any[]) => {
  return movieRows.map(row => ({
    imdbId: row.imdbId,
    title: row.title,
    genres: parseJsonField(row.genres),
    releaseDate: row.releaseDate,
    budget: formatCurrency(row.budget),
  }));
};

// Unified helper to package data into your requested pagination layout
const wrapPaginatedResponse = (data: any[], totalItems: number, page: number) => {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  return {
    results: data,
    pagination: {
      page,
      pageSize: ITEMS_PER_PAGE,
      total: totalItems,
      totalPages
    }
  };
};

// ==========================================
// ROUTES
// ==========================================

/**
 * 1. List All Movies (Updated with metadata)
 */
router.get('/movies', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string, 10);
    const validatedPage = isNaN(page) || page < 1 ? 1 : page;
    const offset = (validatedPage - 1) * ITEMS_PER_PAGE;

    // 1. Get total record count
    const [{ totalCount }] = await moviesDb
      .select({ totalCount: count() })
      .from(movies);

    // 2. Fetch page data
    const allMovies = await moviesDb
      .select({
        imdbId: movies.imdbId,
        title: movies.title,
        genres: movies.genres,
        releaseDate: movies.releaseDate,
        budget: movies.budget,
      })
      .from(movies)
      .limit(ITEMS_PER_PAGE)
      .offset(offset);

    return res.json(wrapPaginatedResponse(formatMovieList(allMovies), totalCount, page));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * 2. Movie Details (Remains unchanged as it is a single item lookup)
 */
router.get('/movies/:imdbId', async (req, res) => {
    try {
      const { imdbId } = req.params;
  
      // 1. Fetch movie metadata from movies.db using the string imdbId
      const movieData = await moviesDb
        .select()
        .from(movies)
        .where(eq(movies.imdbId, imdbId))
        .get();
  
      if (!movieData) {
        return res.status(404).json({ error: 'Movie not found' });
      }
  
      // 2. Extract internal numeric ID to cross-reference the separate ratings.db
      const internalMovieId = movieData.movieId;
  
      const ratingAggregation = await ratingsDb
        .select({ avgRating: avg(ratings.rating) })
        .from(ratings)
        .where(eq(ratings.movieId, internalMovieId))
        .get();
  
      // 3. Format and stitch the exact payload response
      const responsePayload = {
        imdbId: movieData.imdbId,
        title: movieData.title,
        description: movieData.overview,
        releaseDate: movieData.releaseDate,
        budget: formatCurrency(movieData.budget),
        runtime: movieData.runtime,
        averageRating: ratingAggregation?.avgRating 
          ? parseFloat(parseFloat(ratingAggregation.avgRating).toFixed(2)) 
          : null,
        genres: parseJsonField(movieData.genres),
        originalLanguage: movieData.language,
        productionCompanies: parseJsonField(movieData.productionCompanies)
      };
  
      return res.json(responsePayload);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  });

/**
 * 3. Movies By Year (Updated with metadata)
 */
router.get('/movies/year/:year', async (req, res) => {
  try {
    const targetYear = req.params.year;
    const order = (req.query.order as string)?.toLowerCase() === 'desc' ? desc : asc;
    const searchPattern = `${targetYear}%`;

    const page = parseInt(req.query.page as string, 10);
    const validatedPage = isNaN(page) || page < 1 ? 1 : page;
    const offset = (validatedPage - 1) * ITEMS_PER_PAGE;

    // 1. Count matching rows for this year
    const [{ totalCount }] = await moviesDb
      .select({ totalCount: count() })
      .from(movies)
      .where(like(movies.releaseDate, searchPattern));

    // 2. Fetch page data
    const yearlyMovies = await moviesDb
      .select({
        imdbId: movies.imdbId,
        title: movies.title,
        genres: movies.genres,
        releaseDate: movies.releaseDate,
        budget: movies.budget,
      })
      .from(movies)
      .where(like(movies.releaseDate, searchPattern))
      .orderBy(order(movies.releaseDate))
      .limit(ITEMS_PER_PAGE)
      .offset(offset);

    return res.json(wrapPaginatedResponse(formatMovieList(yearlyMovies), totalCount, page));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * 4. Movies By Genre (Updated with metadata)
 */
router.get('/movies/genre/:genre', async (req, res) => {
    try {
        const rawGenre = req.params.genre;
    
        // 1. Sanitize incoming pagination params
        const page = parseInt(req.query.page as string, 10);
        const validatedPage = isNaN(page) || page < 1 ? 1 : page;
        const offset = (validatedPage - 1) * ITEMS_PER_PAGE;
    
        // 2. Normalize the user's input string to lowercase and replace hyphens with spaces
        // Example: "science-fiction" -> "science fiction"
        // Example: "Science Fiction" -> "science fiction"
        const normalizedGenre = rawGenre.toLowerCase().replace(/-/g, ' ').trim();
    
        // 3. Compile a SQLite JSON condition that normalizes the DB values to match
        const genreCondition = sql`exists (
          select 1 
          from json_each(${movies.genres}) 
          where lower(replace(json_extract(json_each.value, '$.name'), '-', ' ')) = ${normalizedGenre}
        )`;
    
        // 4. Count total matching rows
        const [{ totalCount }] = await moviesDb
          .select({ totalCount: count() })
          .from(movies)
          .where(genreCondition);
    
        // 5. Fetch page data
        const genreMovies = await moviesDb
          .select({
            imdbId: movies.imdbId,
            title: movies.title,
            genres: movies.genres,
            releaseDate: movies.releaseDate,
            budget: movies.budget,
          })
          .from(movies)
          .where(genreCondition)
          .limit(ITEMS_PER_PAGE)
          .offset(offset);
    
        return res.json(wrapPaginatedResponse(formatMovieList(genreMovies), totalCount, validatedPage));
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
});

export default router;
