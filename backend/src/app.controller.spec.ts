import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { ConfigService } from './core/config.service.js';
import { OllamaService } from './modules/ollama/ollama.service.js';
import { VectorStoreService } from './modules/rag/vector-store.service.js';
import { KnowledgeFallbackService } from './modules/rag/knowledge-fallback.service.js';
import { DatabaseService } from './modules/database/database.service.js';
import { RedisService } from './modules/redis/redis.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ConfigService,
          useValue: { isWhatsAppEnabled: true },
        },
        {
          provide: OllamaService,
          useValue: {
            healthCheck: () => Promise.resolve({ ok: true, model: 'gpt-oss:120b', cloud: true }),
          },
        },
        {
          provide: VectorStoreService,
          useValue: {
            listDocuments: () => [{ code: 'IPF-1' }],
            approvedChunkCount: () => 5,
          },
        },
        {
          provide: KnowledgeFallbackService,
          useValue: {
            documentCount: () => 2,
          },
        },
        {
          provide: DatabaseService,
          useValue: {
            healthCheck: () => Promise.resolve(true),
            db: {},
          },
        },
        {
          provide: RedisService,
          useValue: {
            healthCheck: () => Promise.resolve(true),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return status OK with postgres and redis status', async () => {
      const result = await appController.health();
      expect(result.status).toBe('OK');
      expect(result.whatsapp).toBe(true);
      expect(result.rag.approvedChunks).toBe(5);
      expect(result.database.postgres).toBe(true);
      expect(result.database.drizzle).toBe(true);
      expect(result.redis).toBe(true);
    });
  });
});
