import { Injectable } from '@nestjs/common';
import type { IRateLimitPort } from '../domain/ports/IRateLimitPort.js';
import { redisReady } from './redis-client.js';

/** Ventana fija de 60s por clave (docs/00-alcance-mvp.md P0.8). */
@Injectable()
export class RedisRateLimitAdapter implements IRateLimitPort {
  async isAllowed(key: string, limitPerMinute: number): Promise<boolean> {
    const client = await redisReady;
    const windowKey = `ratelimit:${key}:${Math.floor(Date.now() / 60_000)}`;

    const count = await client.incr(windowKey);
    if (count === 1) {
      await client.expire(windowKey, 60);
    }

    return count <= limitPerMinute;
  }
}
