import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '../.env' });

if (!process.env.MIGRATION_DATABASE_URL) {
  throw new Error('Falta MIGRATION_DATABASE_URL en .env (usuario admin, ver .env.example)');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.MIGRATION_DATABASE_URL,
  },
});
