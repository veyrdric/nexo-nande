import { Injectable, Logger } from '@nestjs/common';
import { requireEnv } from '../../shared/env.js';
import { formatPhoneNumberForGraph } from './formatPhoneNumberForGraph.js';

/** Envío de texto vía Graph API de Meta (docs/02-contratos.md §4). */
@Injectable()
export class WhatsappClientService {
  private readonly logger = new Logger(WhatsappClientService.name);

  async sendText(to: string, body: string): Promise<void> {
    const apiVersion = requireEnv('WHATSAPP_API_VERSION');
    const phoneNumberId = requireEnv('WHATSAPP_PHONE_NUMBER_ID');
    const accessToken = requireEnv('WHATSAPP_ACCESS_TOKEN');

    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formatPhoneNumberForGraph(to),
        type: 'text',
        text: { preview_url: false, body },
      }),
    });

    if (!response.ok) {
      // P.ej. fuera de la ventana de 24h: se loguea y no se reintenta (docs/02-contratos.md §4).
      this.logger.error(`Graph API respondió ${response.status}: ${await response.text()}`);
    }
  }
}
