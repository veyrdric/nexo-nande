import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import '../shared/env.js';
import * as schema from './schema.js';

if (!process.env.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL en .env (usuario de la app, ver .env.example)');
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });
