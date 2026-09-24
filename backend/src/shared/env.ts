import path from 'node:path';
import { config } from 'dotenv';

/**
 * Carga el .env de la raíz del monorepo. Se importa por su efecto secundario,
 * siempre antes de leer process.env (main.ts la importa primero que nada).
 */
config({ path: path.resolve(import.meta.dirname, '../../../.env') });

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value === 'CAMBIAR') {
    throw new Error(`Falta ${name} en .env (ver .env.example)`);
  }
  return value;
}
