import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '../../core/config.service.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client?: RedisClientType;
  private isConnected = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.isRedisConfigured) {
      this.logger.warn('REDIS_URL no configurada; Redis inactivo.');
      return;
    }

    try {
      this.client = createClient({
        url: this.config.REDIS_URL,
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.error(`Error en cliente Redis: ${err.message}`);
      });

      this.client.on('connect', () => {
        this.isConnected = true;
      });

      await this.client.connect();
      const pong = await this.client.ping();
      this.logger.log(`Conectado a Redis con éxito: ${pong}`);
    } catch (err: unknown) {
      this.isConnected = false;
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`No se pudo conectar a Redis: ${msg}`);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      return await this.client.get(key);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error obteniendo clave ${key} de Redis: ${msg}`);
      return null;
    }
  }

  async set(key: string, value: string, options?: { EX?: number }): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      if (options?.EX) {
        await this.client.set(key, value, { EX: options.EX });
      } else {
        await this.client.set(key, value);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error guardando clave ${key} en Redis: ${msg}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.del(key);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error borrando clave ${key} en Redis: ${msg}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.logger.log('Conexión a Redis cerrada.');
    }
  }
}
