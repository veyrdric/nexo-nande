import { Module } from '@nestjs/common';
import { AiGatewayModule } from '../ai-gateway/index.js';
import { KnowledgeRetrievalModule } from '../knowledge-retrieval/index.js';
import { ResolveInquiryUseCase } from './domain/use-cases/ResolveInquiryUseCase.js';

@Module({
  imports: [KnowledgeRetrievalModule, AiGatewayModule],
  providers: [ResolveInquiryUseCase],
  exports: [ResolveInquiryUseCase],
})
export class ChatOrchestrationModule {}
