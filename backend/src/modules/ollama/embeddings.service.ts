import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../core/config.service.js';

@Injectable()
export class EmbeddingsService {
  constructor(private readonly config: ConfigService) {}

  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${this.config.EMBED_URL}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.EMBED_MODEL,
        input: texts,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Embeddings error ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as { embeddings: number[][] };
    return data.embeddings;
  }
}
