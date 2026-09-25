import { Module } from '@nestjs/common';
import { OllamaModule } from '../ollama/ollama.module.js';
import { RagModule } from '../rag/rag.module.js';
import { SessionMemoryService } from './session-memory.service.js';
import { AssistantService } from './assistant.service.js';
import { ChatController } from './chat.controller.js';

@Module({
  imports: [OllamaModule, RagModule],
  controllers: [ChatController],
  providers: [SessionMemoryService, AssistantService],
  exports: [AssistantService, SessionMemoryService],
})
export class ChatModule {}
