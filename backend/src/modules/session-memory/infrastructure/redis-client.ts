import { createClient } from 'redis';
import { requireEnv } from '../../../shared/env.js';

export const redisClient = createClient({ url: requireEnv('REDIS_URL') });

redisClient.on('error', (error: unknown) => {
  console.error('Redis error', error);
});

/** Se conecta una sola vez; cada uso espera esta promesa (cacheada tras el primer connect). */
export const redisReady = redisClient.connect().then(() => redisClient);
