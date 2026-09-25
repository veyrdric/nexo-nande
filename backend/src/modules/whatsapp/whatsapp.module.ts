import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module.js';
import { WhatsappService } from './whatsapp.service.js';
import { WhatsappController } from './whatsapp.controller.js';

@Module({
  imports: [ChatModule],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
