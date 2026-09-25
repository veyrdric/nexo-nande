import { Module } from '@nestjs/common';
import { OllamaService } from './ollama.service.js';
import { EmbeddingsService } from './embeddings.service.js';

@Module({
  providers: [OllamaService, EmbeddingsService],
  exports: [OllamaService, EmbeddingsService],
})
export class OllamaModule {}
