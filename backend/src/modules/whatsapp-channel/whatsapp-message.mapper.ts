import type { StructuredAnswer } from '../ai-gateway/index.js';

export interface IncomingWhatsappMessage {
  id: string;
  from: string;
  type: string;
  text: string | null;
}

interface WhatsappWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          id: string;
          from: string;
          type: string;
          text?: { body: string };
        }>;
      };
    }>;
  }>;
}

/** Extrae el primer mensaje del evento (docs/02-contratos.md §1.2). Formato de Meta, cuerpo no confiable. */
export function extractFirstMessage(body: unknown): IncomingWhatsappMessage | null {
  const payload = body as WhatsappWebhookPayload;
  const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message?.id || !message?.from || !message?.type) return null;

  return {
    id: message.id,
    from: message.from,
    type: message.type,
    text: message.text?.body ?? null,
  };
}

/** Conversión a texto de WhatsApp (docs/02-contratos.md §3). */
export function buildWhatsAppReplyText(answer: StructuredAnswer): string {
  const parts = [answer.answerMarkdown];
  if (answer.missingInfoNote) {
    parts.push(answer.missingInfoNote);
  }

  const firstSource = answer.sources[0];
  parts.push(
    firstSource
      ? `— Servicio informativo, no oficial. Fuente: ${firstSource.title} (${firstSource.url})`
      : '— Servicio informativo, no oficial.',
  );

  return parts.join('\n\n');
}
