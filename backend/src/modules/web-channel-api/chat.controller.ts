import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ResolveInquiryUseCase } from '../chat-orchestration/index.js';
import { chatRequestSchema } from './chat-request.schema.js';
import { extractChecklist } from './checklist.util.js';

// docs/02-contratos.md §6
@Controller('api/v1/chat')
export class ChatController {
  constructor(private readonly resolveInquiry: ResolveInquiryUseCase) {}

  @Post()
  async chat(@Body() body: unknown) {
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const { answer } = await this.resolveInquiry.execute({ message: parsed.data.message });

    return {
      answerMarkdown: answer.answerMarkdown,
      sources: answer.sources,
      knowsAnswer: answer.knowsAnswer,
      missingInfoNote: answer.missingInfoNote,
      checklist: extractChecklist(answer.answerMarkdown),
    };
  }
}
