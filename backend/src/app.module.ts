import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { WebChannelApiModule } from './modules/web-channel-api/index.js';

@Module({
  imports: [WebChannelApiModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
