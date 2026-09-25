import { Module } from '@nestjs/common';
import { VectorStoreService } from './vector-store.service.js';
import { KnowledgeFallbackService } from './knowledge-fallback.service.js';
import { RagController } from './rag.controller.js';

@Module({
  controllers: [RagController],
  providers: [VectorStoreService, KnowledgeFallbackService],
  exports: [VectorStoreService, KnowledgeFallbackService],
})
export class RagModule {}
