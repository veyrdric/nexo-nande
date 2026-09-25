import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '../../core/config.service.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaHealthResult {
  ok: boolean;
  model: string;
  cloud: boolean;
  available?: string[];
  error?: string;
}

@Injectable()
export class OllamaService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OllamaService.name);

  constructor(private readonly config: ConfigService) {}

  async onApplicationBootstrap(): Promise<void> {
    this.warmUp().catch((err) => {
      this.logger.error(`No se pudo precargar el modelo: ${err.message}`);
    });
  }

  private isCloudDirect(): boolean {
    return this.config.OLLAMA_URL.includes('ollama.com');
  }

  private buildUrl(path: string): string {
    return `${this.config.OLLAMA_URL}${path}`;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.isCloudDirect()) {
      if (!this.config.OLLAMA_API_KEY) {
        throw new Error('Falta OLLAMA_API_KEY para llamar directo a ollama.com');
      }
      headers.Authorization = `Bearer ${this.config.OLLAMA_API_KEY}`;
    }
    return headers;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.config.OLLAMA_MODEL,
      messages,
      stream: false,
    };

    if (!this.isCloudDirect()) {
      body.options = { num_ctx: this.config.OLLAMA_NUM_CTX };
    }

    const res = await fetch(this.buildUrl('/api/chat'), {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama chat error ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as { message?: { content?: string } };
    return data.message?.content?.trim() || '';
  }

  async healthCheck(): Promise<OllamaHealthResult> {
    try {
      const res = await fetch(this.buildUrl('/api/tags'), {
        headers: this.buildHeaders(),
      });
      if (!res.ok) {
        return {
          ok: false,
          model: this.config.OLLAMA_MODEL,
          cloud: this.isCloudDirect(),
          error: `HTTP ${res.status}`,
        };
      }
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const names = (data.models || []).map((m) => m.name);
      const hasModel =
        names.includes(this.config.OLLAMA_MODEL) ||
        names.some((n) => n.startsWith(`${this.config.OLLAMA_MODEL}:`));
      return {
        ok: hasModel,
        model: this.config.OLLAMA_MODEL,
        cloud: this.isCloudDirect(),
        available: names,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        model: this.config.OLLAMA_MODEL,
        cloud: this.isCloudDirect(),
        error: message,
      };
    }
  }

  async warmUp(): Promise<void> {
    this.logger.log(`Precargando modelo ${this.config.OLLAMA_MODEL}...`);
    const start = Date.now();
    await this.chat([{ role: 'user', content: 'hola' }]);
    this.logger.log(`Modelo listo en ${Date.now() - start}ms`);
  }
}
