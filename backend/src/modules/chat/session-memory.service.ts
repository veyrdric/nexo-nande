import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../core/config.service.js';
import { ChatMessage } from '../ollama/ollama.service.js';
import { RedisService } from '../redis/redis.service.js';

interface SessionRecord {
  turns: ChatMessage[];
  lastActivity: number;
}

@Injectable()
export class SessionMemoryService {
  private readonly logger = new Logger(SessionMemoryService.name);
  private readonly memoryCache = new Map<string, SessionRecord>();

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  private pruneMemory(): void {
    const cutoff = Date.now() - this.config.HISTORY_TTL_MS;
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.lastActivity < cutoff) {
        this.memoryCache.delete(key);
      }
    }
  }

  async getHistory(sessionId: string): Promise<ChatMessage[]> {
    this.pruneMemory();

    // 1. Intentar leer de Redis
    const redisKey = `session:${sessionId}`;
    const cached = await this.redis.get(redisKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as ChatMessage[];
        if (Array.isArray(parsed)) {
          this.memoryCache.set(sessionId, { turns: parsed, lastActivity: Date.now() });
          return parsed;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Error parseando historial de Redis para ${sessionId}: ${msg}`);
      }
    }

    // 2. Fallback al caché en memoria
    const entry = this.memoryCache.get(sessionId);
    return entry ? [...entry.turns] : [];
  }

  async appendTurn(sessionId: string, question: string, reply: string): Promise<void> {
    const existing = await this.getHistory(sessionId);
    const updated = [
      ...existing,
      { role: 'user' as const, content: question },
      { role: 'assistant' as const, content: reply },
    ];

    const maxMessages = this.config.HISTORY_MAX_TURNS * 2;
    const trimmed = updated.slice(-maxMessages);

    // Guardar en memoria local
    this.memoryCache.set(sessionId, {
      turns: trimmed,
      lastActivity: Date.now(),
    });

    // Guardar en Redis con TTL
    const redisKey = `session:${sessionId}`;
    const ttlSeconds = Math.round(this.config.HISTORY_TTL_MS / 1000);
    await this.redis.set(redisKey, JSON.stringify(trimmed), { EX: ttlSeconds });
  }

  async clearHistory(sessionId: string): Promise<void> {
    this.memoryCache.delete(sessionId);
    await this.redis.del(`session:${sessionId}`);
  }
}
