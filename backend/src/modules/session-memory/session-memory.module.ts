import { Module } from '@nestjs/common';
import { RATE_LIMIT_PORT } from './domain/ports/IRateLimitPort.js';
import { SESSION_MEMORY_PORT } from './domain/ports/ISessionMemoryPort.js';
import { RedisRateLimitAdapter } from './infrastructure/RedisRateLimitAdapter.js';
import { RedisSessionMemoryAdapter } from './infrastructure/RedisSessionMemoryAdapter.js';

@Module({
  providers: [
    { provide: SESSION_MEMORY_PORT, useClass: RedisSessionMemoryAdapter },
    { provide: RATE_LIMIT_PORT, useClass: RedisRateLimitAdapter },
  ],
  exports: [SESSION_MEMORY_PORT, RATE_LIMIT_PORT],
})
export class SessionMemoryModule {}
