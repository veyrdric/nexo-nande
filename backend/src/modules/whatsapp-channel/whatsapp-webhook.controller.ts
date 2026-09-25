import { createHash } from 'node:crypto';
import { Controller, Get, HttpStatus, Logger, Post, Query, Req, Res } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ResolveInquiryUseCase } from '../chat-orchestration/index.js';
import { requireEnv } from '../../shared/env.js';
import { MessageDedupService } from './message-dedup.service.js';
import { WhatsappClientService } from './whatsapp-client.service.js';
import { WhatsappSignatureService } from './whatsapp-signature.service.js';
import { buildWhatsAppReplyText, extractFirstMessage } from './whatsapp-message.mapper.js';

const UNSUPPORTED_TYPE_REPLY =
  'Por ahora solo puedo leer mensajes de texto. Escribime tu consulta como texto, por favor.';
const BORRAR_REPLY = 'Listo, borré tus datos de esta conversación.';

// docs/02-contratos.md §1
@Controller('webhooks/whatsapp')
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(
    private readonly signatureService: WhatsappSignatureService,
    private readonly dedupService: MessageDedupService,
    private readonly whatsappClient: WhatsappClientService,
    private readonly resolveInquiry: ResolveInquiryUseCase,
  ) {}

  @Get()
  verify(@Query() query: Record<string, string>, @Res() res: Response): void {
    const isValid =
      query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === requireEnv('WHATSAPP_VERIFY_TOKEN');

    if (isValid) {
      res.status(HttpStatus.OK).send(query['hub.challenge']);
    } else {
      res.status(HttpStatus.FORBIDDEN).send();
    }
  }

  @Post()
  receive(@Req() req: RawBodyRequest<Request>, @Res() res: Response): void {
    const signatureHeader = req.headers['x-hub-signature-256'];

    if (!req.rawBody || !this.signatureService.isValid(req.rawBody, signatureHeader)) {
      res.status(HttpStatus.UNAUTHORIZED).send();
      return;
    }

    // Responder 200 de inmediato; el resto se procesa en segundo plano (docs/02-contratos.md §1.2).
    res.status(HttpStatus.OK).send();

    this.processInBackground(req.body).catch((error: unknown) => {
      this.logger.error('Error procesando mensaje de WhatsApp', error as Error);
    });
  }

  private async processInBackground(body: unknown): Promise<void> {
    const message = extractFirstMessage(body);
    if (!message) return;

    if (this.dedupService.isDuplicate(message.id)) {
      this.logger.warn(`Mensaje duplicado ignorado: ${message.id}`);
      return;
    }

    // El teléfono se hashea de inmediato; el resto del flujo nunca ve el número en claro
    // salvo el cliente de envío, que necesita el "to" real (docs/02-contratos.md §1.2, backend/CLAUDE.md).
    const phoneHash = hashPhone(message.from);
    this.logger.log(`Mensaje recibido de ${phoneHash.slice(0, 8)}…`);

    if (message.type !== 'text') {
      await this.whatsappClient.sendText(message.from, UNSUPPORTED_TYPE_REPLY);
      return;
    }

    const text = message.text?.trim() ?? '';

    if (text.toUpperCase() === 'BORRAR') {
      // TODO(session-memory): limpiar la sesión real en Redis cuando exista ese módulo.
      await this.whatsappClient.sendText(message.from, BORRAR_REPLY);
      return;
    }

    const { answer } = await this.resolveInquiry.execute({ message: text });
    await this.whatsappClient.sendText(message.from, buildWhatsAppReplyText(answer));
  }
}

function hashPhone(phone: string): string {
  return createHash('sha256').update(requireEnv('PHONE_HASH_SALT') + phone).digest('hex');
}
