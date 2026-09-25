import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { WebChannelApiModule } from './modules/web-channel-api/index.js';
import { WhatsappChannelModule } from './modules/whatsapp-channel/index.js';

@Module({
  imports: [WebChannelApiModule, WhatsappChannelModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
