import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { ConfigService } from '../../core/config.service.js';
import * as schema from '../../db/schema.js';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool?: Pool;
  public db?: NodePgDatabase<typeof schema>;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.isPostgresConfigured) {
      this.logger.warn('DATABASE_URL no configurada; PostgreSQL y Drizzle ORM inactivos.');
      return;
    }

    try {
      this.pool = new Pool({
        connectionString: this.config.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30000,
      });

      this.db = drizzle(this.pool, { schema });

      // Verificación de conexión
      const res = await this.pool.query('SELECT NOW()');
      this.logger.log(`Conectado a PostgreSQL con éxito (Drizzle ORM listo): ${res.rows[0].now}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error conectando a PostgreSQL: ${msg}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.pool) return false;
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('Pool de PostgreSQL cerrado.');
    }
  }
}
