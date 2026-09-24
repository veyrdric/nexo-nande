import { Module } from '@nestjs/common';
import { AI_COMPLETION_PORT } from './domain/ports/IAiCompletionPort.js';
import { OpenAiCompatibleAdapter } from './infrastructure/OpenAiCompatibleAdapter.js';

@Module({
  providers: [{ provide: AI_COMPLETION_PORT, useClass: OpenAiCompatibleAdapter }],
  exports: [AI_COMPLETION_PORT],
})
export class AiGatewayModule {}
