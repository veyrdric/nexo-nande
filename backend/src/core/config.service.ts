import { Injectable } from '@nestjs/common';
import dotenv from 'dotenv';

dotenv.config();

const num = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

@Injectable()
export class ConfigService {
  readonly PORT: number = num(process.env.PORT || process.env.BACKEND_PORT, 3005);
  readonly CORS_ORIGINS: string[] = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  readonly OLLAMA_URL: string = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');
  readonly OLLAMA_MODEL: string = process.env.OLLAMA_MODEL || 'llama3.2:3b';
  readonly OLLAMA_NUM_CTX: number = num(process.env.OLLAMA_NUM_CTX, 8192);
  readonly OLLAMA_API_KEY: string = process.env.OLLAMA_API_KEY || '';

  readonly EMBED_URL: string = (process.env.EMBED_URL || 'http://localhost:11434').replace(/\/$/, '');
  readonly EMBED_MODEL: string = process.env.EMBED_MODEL || 'bge-m3';
  readonly RAG_TOP_K: number = num(process.env.RAG_TOP_K, 6);
  readonly RAG_MIN_SCORE: number = Number(process.env.RAG_MIN_SCORE) || 0.35;
  readonly RAG_STORE_PATH: string = process.env.RAG_STORE_PATH || 'data/vector-store.json';
  readonly RAG_INGEST_SECRET: string = process.env.RAG_INGEST_SECRET || '';

  readonly HISTORY_MAX_TURNS: number = num(process.env.HISTORY_MAX_TURNS, 8);
  readonly HISTORY_TTL_MS: number = num(process.env.HISTORY_TTL_HOURS, 24) * 60 * 60 * 1000;

  readonly PHONE_HASH_SALT: string = process.env.PHONE_HASH_SALT || '';

  readonly META_TOKEN: string = process.env.META_TOKEN || '';
  readonly META_PHONE_ID: string = process.env.META_PHONE_ID || '';
  readonly VERIFY_TOKEN: string = process.env.VERIFY_TOKEN || '';

  readonly DATABASE_URL: string = process.env.DATABASE_URL || '';
  readonly MIGRATION_DATABASE_URL: string = process.env.MIGRATION_DATABASE_URL || '';
  readonly REDIS_URL: string = process.env.REDIS_URL || '';

  get isWhatsAppEnabled(): boolean {
    return Boolean(this.META_TOKEN && this.META_PHONE_ID);
  }

  get isPostgresConfigured(): boolean {
    return Boolean(this.DATABASE_URL);
  }

  get isRedisConfigured(): boolean {
    return Boolean(this.REDIS_URL);
  }
}
