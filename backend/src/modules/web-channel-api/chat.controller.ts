import { BadRequestException, Body, Controller, HttpException, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ResolveInquiryUseCase } from '../chat-orchestration/index.js';
import { RATE_LIMIT_PORT, type IRateLimitPort } from '../session-memory/index.js';
import { requireEnv } from '../../shared/env.js';
import { chatRequestSchema } from './chat-request.schema.js';
import { extractChecklist } from './checklist.util.js';

// docs/02-contratos.md §6
@Controller('api/v1/chat')
export class ChatController {
  constructor(
    private readonly resolveInquiry: ResolveInquiryUseCase,
    @Inject(RATE_LIMIT_PORT) private readonly rateLimit: IRateLimitPort,
  ) {}

  @Post()
  async chat(@Body() body: unknown, @Req() req: Request) {
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const limitPerMinute = Number(requireEnv('RATE_LIMIT_WEB_PER_IP_PER_MIN'));
    const allowed = await this.rateLimit.isAllowed(`web:${req.ip}`, limitPerMinute);
    if (!allowed) {
      throw new HttpException('Demasiadas consultas, esperá un minuto.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const { answer } = await this.resolveInquiry.execute({
      sessionKey: parsed.data.sessionId,
      message: parsed.data.message,
    });

    return {
      answerMarkdown: answer.answerMarkdown,
      sources: answer.sources,
      knowsAnswer: answer.knowsAnswer,
      missingInfoNote: answer.missingInfoNote,
      checklist: extractChecklist(answer.answerMarkdown),
    };
  }
}
