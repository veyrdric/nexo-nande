import { Module } from '@nestjs/common';
import { ChatOrchestrationModule } from '../chat-orchestration/index.js';
import { ChatController } from './chat.controller.js';

@Module({
  imports: [ChatOrchestrationModule],
  controllers: [ChatController],
})
export class WebChannelApiModule {}
