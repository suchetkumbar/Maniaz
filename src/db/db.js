import 'dotenv/config';
import { drizzle } from 'drizzle-orm';
import { pg } from 'pg';

if(!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

export const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);