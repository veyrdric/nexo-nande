import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module.js';
import { DatabaseModule } from './modules/database/database.module.js';
import { RedisModule } from './modules/redis/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { OllamaModule } from './modules/ollama/ollama.module.js';
import { RagModule } from './modules/rag/rag.module.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [
    CoreModule,
    DatabaseModule,
    RedisModule,
    AuthModule,
    OllamaModule,
    RagModule,
    ChatModule,
    WhatsappModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
