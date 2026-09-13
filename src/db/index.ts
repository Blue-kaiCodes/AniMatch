import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';
import * as schema from './schema.ts';
import { getCorrectSqlHost } from './hostResolver.ts';

dotenv.config();

export const createPool = () => {
  const rawHost = process.env.SQL_HOST;
  const correctedHost = getCorrectSqlHost(rawHost);
  return new Pool({
    host: correctedHost,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15000,
  });
};

const pool = createPool();

pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

export const db = drizzle(pool, { schema });
