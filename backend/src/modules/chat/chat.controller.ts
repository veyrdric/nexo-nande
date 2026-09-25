import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AssistantService } from './assistant.service.js';

const MAX_MESSAGE_CHARS = 2000;
const SESSION_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

interface ChatRequestBody {
  sessionId?: string;
  message?: string;
}

@Controller()
export class ChatController {
  constructor(private readonly assistant: AssistantService) {}

  private validatePayload(body: ChatRequestBody): { sessionId: string; message: string } {
    const { sessionId, message } = body || {};

    if (typeof sessionId !== 'string' || !SESSION_ID_RE.test(sessionId)) {
      throw new HttpException('sessionId inválido', HttpStatus.BAD_REQUEST);
    }
    if (typeof message !== 'string' || !message.trim()) {
      throw new HttpException('message es obligatorio', HttpStatus.BAD_REQUEST);
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      throw new HttpException(
        `message supera ${MAX_MESSAGE_CHARS} caracteres`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return { sessionId, message: message.trim() };
  }

  @Post('api/chat')
  async chat(@Body() body: ChatRequestBody) {
    const { sessionId, message } = this.validatePayload(body);
    const { reply, sources } = await this.assistant.answer(`web:${sessionId}`, message);
    return { reply, sources };
  }

  // Compatibilidad con la ruta /api/v1/chat
  @Post('api/v1/chat')
  async chatV1(@Body() body: ChatRequestBody) {
    const { sessionId, message } = this.validatePayload(body);
    const { reply, sources } = await this.assistant.answer(`web:${sessionId}`, message);
    return {
      answerMarkdown: reply,
      sources,
      knowsAnswer: sources.length > 0,
      missingInfoNote: sources.length === 0 ? 'No cuento con esa información' : null,
      checklist: [],
    };
  }

  @Delete('api/chat/:sessionId')
  @HttpCode(204)
  async clearSession(@Param('sessionId') sessionId: string) {
    await this.assistant.clearHistory(`web:${sessionId}`);
  }

  @Post('api/opportunities/search')
  async searchOpportunities(
    @Body()
    body: {
      consulta?: string;
      localidad?: string;
      situacion?: string;
      menores?: string;
    },
  ) {
    return this.assistant.searchOpportunity(body || {});
  }
}
