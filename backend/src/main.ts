import './shared/env.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors({ origin: process.env.CORS_ORIGINS?.split(',') });
  await app.listen(process.env.BACKEND_PORT ?? 3000);
}
await bootstrap();
