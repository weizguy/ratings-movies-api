import request from 'supertest';
import app from '../../app'; // Path to your src/app.ts file

describe('🎥 Movies Feature API Integration Tests', () => {
  
  // Test 1: List All Movies Pagination
  describe('GET /api/movies', () => {
    it('should return a paginated list of movies with 50 items and metadata', async () => {
      const response = await request(app)
        .get('/api/movies')
        .query({ page: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBeLessThanOrEqual(50);
      
      // Pagination metadata structure assertions
      const { pagination } = response.body;
      expect(pagination).toEqual(
        expect.objectContaining({
          page: 1,
          pageSize: 50,
          total: expect.any(Number),
          totalPages: expect.any(Number),
        })
      );

      // Verify list view item shapes
      if (response.body.results.length > 0) {
        const item = response.body.results[0];
        expect(item).toHaveProperty('imdbId');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('genres');
        expect(item).toHaveProperty('releaseDate');
        expect(item).toHaveProperty('budget');
      }
    });
  });

  // Test 2: Movie Details via imdbId
  describe('GET /api/movies/:imdbId', () => {
    it('should fetch detailed records for a valid imdbId string', async () => {
      // Using 'tt0094675' (Ariel) based on your sample rows
      const targetImdbId = 'tt0094675'; 
      
      const response = await request(app).get(`/api/movies/${targetImdbId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          imdbId: targetImdbId,
          title: expect.any(String),
          description: expect.any(String),
          releaseDate: expect.any(String),
          genres: expect.any(Array),
          productionCompanies: expect.any(Array),
        })
      );
      
      // Asserts that currency was parsed/formatted or returned as null/string
      if (response.body.budget !== null) {
        expect(typeof response.body.budget).toBe('string');
        expect(response.body.budget.startsWith('$')).toBe(true);
      }
      
      // Checks average rating is attached
      expect(response.body).toHaveProperty('averageRating');
    });

    it('should return 404 for an invalid or non-existent imdbId', async () => {
      const response = await request(app).get('/api/movies/tt000000000000');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Movie not found');
    });
  });

  // Test 3: Movies By Year
  describe('GET /api/movies/year/:year', () => {
    it('should filter movies by year and support sorting', async () => {
      const response = await request(app)
        .get('/api/movies/year/1988')
        .query({ order: 'desc', page: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('results');
      expect(response.body.pagination.page).toBe(1);

      if (response.body.results.length > 0) {
        expect(response.body.results[0].releaseDate.startsWith('1988')).toBe(true);
      }
    });
  });

  // Test 4: Movies By Genre via SQLite Native JSON Scanning
  describe('GET /api/movies/genre/:genre', () => {
    it('should parse internal string arrays using case-insensitive and hyphen-agnostic matching', async () => {
      // Test variation 1: Hyphenated and lowercase
      const responseHyphen = await request(app).get('/api/movies/genre/science-fiction');
      expect(responseHyphen.status).toBe(200);
      expect(responseHyphen.body).toHaveProperty('results');
      
      if (responseHyphen.body.results.length > 0) {
        expect(responseHyphen.body.results[0].genres).toContain('Science Fiction');
      }

      // Test variation 2: Standard casing with spaces
      const responseSpaced = await request(app).get('/api/movies/genre/Science Fiction');
      expect(responseSpaced.status).toBe(200);
      expect(responseSpaced.body.results.length).toEqual(responseHyphen.body.results.length);
    });
  });

  // more tests based on bug fixes
  describe('GET /api/movies/year/:year validation', () => {
    it.each(['19', '%', 'abcd', '19955'])('returns 400 for invalid year %p', async (year) => {
      const res = await request(app).get(`/api/movies/year/${encodeURIComponent(year)}`);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
  
  describe('pagination', () => {
    it('defaults an invalid page to 1 in the response metadata', async () => {
      const res = await request(app).get('/api/movies?page=abc');
      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
    });
  
    it('returns different movies on page 1 and page 2', async () => {
      const [p1, p2] = await Promise.all([
        request(app).get('/api/movies?page=1'),
        request(app).get('/api/movies?page=2'),
      ]);
      const ids1 = new Set(p1.body.results.map((m: { imdbId: string }) => m.imdbId));
      const overlap = p2.body.results.filter((m: { imdbId: string }) => ids1.has(m.imdbId));
      expect(overlap).toHaveLength(0);
    });
  });
  
  describe('Unknown routes', () => {
    it('returns JSON 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nope');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('pagination', () => {
    it('honors pageSize and caps it at the maximum', async () => {
      const small = await request(app).get('/api/movies?pageSize=10');
      expect(small.body.results).toHaveLength(10);
      expect(small.body.pagination.pageSize).toBe(10);
    
      const huge = await request(app).get('/api/movies?pageSize=5000');
      expect(huge.body.pagination.pageSize).toBe(100);
    }); 
  }); 
});
