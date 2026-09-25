import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { requireEnv } from '../../shared/env.js';

/**
 * Verifica X-Hub-Signature-256 (HMAC-SHA256 sobre el cuerpo crudo, WHATSAPP_APP_SECRET)
 * en tiempo constante (backend/CLAUDE.md, docs/02-contratos.md §1.2).
 */
@Injectable()
export class WhatsappSignatureService {
  isValid(rawBody: Buffer, signatureHeader: string | string[] | undefined): boolean {
    if (typeof signatureHeader !== 'string') return false;

    const [algorithm, receivedHex] = signatureHeader.split('=');
    if (algorithm !== 'sha256' || !receivedHex) return false;

    const expectedHex = createHmac('sha256', requireEnv('WHATSAPP_APP_SECRET')).update(rawBody).digest('hex');

    const expected = Buffer.from(expectedHex, 'hex');
    const received = Buffer.from(receivedHex, 'hex');
    if (expected.length !== received.length) return false;

    return timingSafeEqual(expected, received);
  }
}
