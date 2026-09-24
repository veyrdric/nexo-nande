import { Module } from '@nestjs/common';
import { KNOWLEDGE_SEARCH_PORT } from './domain/ports/IKnowledgeSearchPort.js';
import { PgvectorKnowledgeSearchAdapter } from './infrastructure/PgvectorKnowledgeSearchAdapter.js';

@Module({
  providers: [{ provide: KNOWLEDGE_SEARCH_PORT, useClass: PgvectorKnowledgeSearchAdapter }],
  exports: [KNOWLEDGE_SEARCH_PORT],
})
export class KnowledgeRetrievalModule {}
