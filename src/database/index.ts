import { Pool, types } from 'pg';

// Keep DATE as 'YYYY-MM-DD' strings (pg converts to JS Date by default)
types.setTypeParser(1082, (value) => value);
// BIGINT comes back as a string by default; budgets/revenue fit safely in a JS number
types.setTypeParser(20, (value) => Number(value));

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});