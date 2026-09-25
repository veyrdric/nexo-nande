import { Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import { ConfigService } from '../../core/config.service.js';
import { AssistantService } from '../chat/assistant.service.js';

interface BufferedUser {
  phone: string;
  phoneId: string;
  messages: string[];
  timer: NodeJS.Timeout;
}

const BUFFER_TIME_MS = 4000;

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly buffer = new Map<string, BufferedUser>();

  constructor(
    private readonly config: ConfigService,
    private readonly assistant: AssistantService,
  ) {}

  private getGraphUrl(phoneId?: string): string {
    return `https://graph.facebook.com/v22.0/${phoneId || this.config.META_PHONE_ID}/messages`;
  }

  hashPhone(phone: string): string {
    return crypto
      .createHash('sha256')
      .update(this.config.PHONE_HASH_SALT + phone)
      .digest('hex')
      .slice(0, 16);
  }

  async graphPost(payload: Record<string, unknown>, phoneId?: string): Promise<void> {
    try {
      const res = await fetch(this.getGraphUrl(phoneId), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.META_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        this.logger.error(`Error WhatsApp ${res.status}: ${errorText}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error WhatsApp: ${msg}`);
    }
  }

  async sendMessage(to: string, text: string, phoneId?: string): Promise<void> {
    await this.graphPost(
      {
        to,
        type: 'text',
        text: { body: text },
      },
      phoneId,
    );
  }

  async markAsRead(messageId: string, phoneId?: string): Promise<void> {
    await this.graphPost({ status: 'read', message_id: messageId }, phoneId);
  }

  verifyWebhook(mode?: string, token?: string, challenge?: string): string | null {
    if (mode === 'subscribe' && this.config.VERIFY_TOKEN && token === this.config.VERIFY_TOKEN) {
      this.logger.log('Webhook de WhatsApp verificado.');
      return challenge ?? '';
    }
    return null;
  }

  private async flush(key: string): Promise<void> {
    const data = this.buffer.get(key);
    if (!data) return;
    this.buffer.delete(key);

    const { reply, sources } = await this.assistant.answer(`wa:${key}`, data.messages.join('\n'));
    let text = reply.replace(/\*\*(.*?)\*\*/g, '*$1*');
    if (sources && sources.length > 0) {
      const links = sources.map((s) => `• ${s.title}: ${s.url}`).join('\n');
      text += `\n\n📌 *Fuente oficial:*\n${links}`;
    }

    await this.sendMessage(data.phone, text, data.phoneId);
    this.logger.log(`[wa:${key}] respuesta enviada a ${data.phone}`);
  }

  async handleIncomingMessage(body: any): Promise<void> {
    try {
      const change = body?.entry?.[0]?.changes?.[0]?.value;
      const msg = change?.messages?.[0];
      if (!msg) return;

      const phone = msg.from;
      const phoneId = change?.metadata?.phone_number_id || this.config.META_PHONE_ID;
      const key = this.hashPhone(phone);

      if (msg.type !== 'text') {
        await this.sendMessage(
          phone,
          '¡Hola! 🧉 Por ahora solo puedo leer mensajes de texto.',
          phoneId,
        );
        return;
      }

      await this.markAsRead(msg.id, phoneId);

      const existing = this.buffer.get(key);
      if (existing) {
        clearTimeout(existing.timer);
        existing.messages.push(msg.text.body);
        existing.timer = setTimeout(() => this.flush(key), BUFFER_TIME_MS);
      } else {
        this.buffer.set(key, {
          phone,
          phoneId,
          messages: [msg.text.body],
          timer: setTimeout(() => this.flush(key), BUFFER_TIME_MS),
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error en webhook de WhatsApp: ${msg}`);
    }
  }
}
