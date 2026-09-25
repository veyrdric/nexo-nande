import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifica un header "sha256=<hex>" contra el HMAC-SHA256 del cuerpo crudo,
 * en tiempo constante. Usado por el webhook de Meta (X-Hub-Signature-256) y
 * por la ingesta de n8n (X-Ingest-Signature).
 */
export function isValidHmacSha256Signature(
  rawBody: Buffer,
  signatureHeader: string | string[] | undefined,
  secret: string,
): boolean {
  if (typeof signatureHeader !== 'string') return false;

  const [algorithm, receivedHex] = signatureHeader.split('=');
  if (algorithm !== 'sha256' || !receivedHex) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const received = Buffer.from(receivedHex, 'hex');
  if (expected.length !== received.length) return false;

  return timingSafeEqual(expected, received);
}
