import { Module } from '@nestjs/common';
import { AiGatewayModule } from '../ai-gateway/index.js';
import { KnowledgeRetrievalModule } from '../knowledge-retrieval/index.js';
import { SessionMemoryModule } from '../session-memory/index.js';
import { ResolveInquiryUseCase } from './domain/use-cases/ResolveInquiryUseCase.js';

@Module({
  imports: [KnowledgeRetrievalModule, AiGatewayModule, SessionMemoryModule],
  providers: [ResolveInquiryUseCase],
  // Re-exporta SessionMemoryModule para que web-channel-api y whatsapp-channel
  // puedan inyectar RATE_LIMIT_PORT sin importarlo aparte.
  exports: [ResolveInquiryUseCase, SessionMemoryModule],
})
export class ChatOrchestrationModule {}
