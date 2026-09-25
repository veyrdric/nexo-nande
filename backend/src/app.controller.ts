import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from './core/config.service.js';
import { OllamaService } from './modules/ollama/ollama.service.js';
import { VectorStoreService } from './modules/rag/vector-store.service.js';
import { KnowledgeFallbackService } from './modules/rag/knowledge-fallback.service.js';
import { DatabaseService } from './modules/database/database.service.js';
import { RedisService } from './modules/redis/redis.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly config: ConfigService,
    private readonly ollama: OllamaService,
    private readonly vectorStore: VectorStoreService,
    private readonly knowledgeFallback: KnowledgeFallbackService,
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  @Get('health')
  async health() {
    try {
      const ollama = await this.ollama.healthCheck();
      const approvedChunks = this.vectorStore.approvedChunkCount();
      const postgres = await this.database.healthCheck();
      const redis = await this.redis.healthCheck();

      const response = {
        status: ollama.ok ? 'OK' : 'MODEL_MISSING',
        ollama,
        knowledgeDocuments: this.knowledgeFallback.documentCount(),
        rag: {
          documents: this.vectorStore.listDocuments().length,
          approvedChunks,
          mode: approvedChunks > 0 ? 'rag' : 'fallback-knowledge-files',
        },
        whatsapp: this.config.isWhatsAppEnabled,
        database: {
          postgres,
          drizzle: Boolean(this.database.db),
        },
        redis,
      };

      if (!ollama.ok) {
        throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
      }

      return response;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpException(
        { status: 'OLLAMA_DOWN', error: msg },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
