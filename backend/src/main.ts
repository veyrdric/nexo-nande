import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { ConfigService } from './core/config.service.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  // 20MB para admitir lotes grandes de fragmentos con embeddings desde n8n
  app.useBodyParser('json', { limit: '20mb' });

  app.enableCors({
    origin: config.CORS_ORIGINS.length ? config.CORS_ORIGINS : true,
  });

  // Log liviano sin datos sensibles
  app.use((req: any, res: any, next: () => void) => {
    const start = Date.now();
    res.on('finish', () => {
      console.log(
        `[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${Date.now() - start}ms`,
      );
    });
    next();
  });

  await app.listen(config.PORT, '0.0.0.0');

  console.log(`\n======================================================`);
  console.log(`Backend (NestJS Monolito Modular) en http://localhost:${config.PORT}`);
  console.log(`Modelo:   ${config.OLLAMA_MODEL} en ${config.OLLAMA_URL}`);
  console.log(`Chat:     POST http://localhost:${config.PORT}/api/chat`);
  console.log(
    `WhatsApp: ${config.isWhatsAppEnabled ? 'habilitado en /webhook' : 'deshabilitado (falta META_TOKEN/META_PHONE_ID)'}`,
  );
  console.log(`======================================================\n`);
}

await bootstrap();
