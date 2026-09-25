import { Module } from '@nestjs/common';
import { ChatOrchestrationModule } from '../chat-orchestration/index.js';
import { MessageDedupService } from './message-dedup.service.js';
import { WhatsappClientService } from './whatsapp-client.service.js';
import { WhatsappSignatureService } from './whatsapp-signature.service.js';
import { WhatsappWebhookController } from './whatsapp-webhook.controller.js';

@Module({
  imports: [ChatOrchestrationModule],
  controllers: [WhatsappWebhookController],
  providers: [WhatsappSignatureService, MessageDedupService, WhatsappClientService],
})
export class WhatsappChannelModule {}
