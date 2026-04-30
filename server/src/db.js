import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * Shared PostgreSQL pool. DATABASE_URL should point at your WrestleIQ database.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Lightweight query helper for consistent error handling in routes.
 */
export async function query(text, params) {
  return pool.query(text, params);
}
