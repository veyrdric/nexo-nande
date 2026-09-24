import { Inject, Injectable } from '@nestjs/common';
import { AI_COMPLETION_PORT, type IAiCompletionPort, type StructuredAnswer } from '../../../ai-gateway/index.js';
import { KNOWLEDGE_SEARCH_PORT, type IKnowledgeSearchPort } from '../../../knowledge-retrieval/index.js';
import { requireEnv } from '../../../../shared/env.js';
import { SYSTEM_PROMPT } from '../SystemPrompt.js';

/**
 * Versión simplificada de ResolveWhatsAppInquiryUseCase (docs/02-contratos.md §2):
 * sin audio (P1) ni memoria de sesión (Redis, se agrega después). Solo texto -> RAG -> respuesta.
 */
export interface ResolveInquiryCommand {
  message: string;
}

export interface ResolveInquiryResult {
  answer: StructuredAnswer;
}

@Injectable()
export class ResolveInquiryUseCase {
  constructor(
    @Inject(KNOWLEDGE_SEARCH_PORT) private readonly knowledgeSearch: IKnowledgeSearchPort,
    @Inject(AI_COMPLETION_PORT) private readonly aiCompletion: IAiCompletionPort,
  ) {}

  async execute(command: ResolveInquiryCommand): Promise<ResolveInquiryResult> {
    const topK = Number(requireEnv('RAG_TOP_K'));
    const minScore = Number(requireEnv('RAG_MIN_SCORE'));

    // Se llama al LLM aunque no haya chunks: el prompt ya instruye a decir "no sé"
    // en ese caso (docs/03-scraper-y-rag.md §4.3).
    const retrievedChunks = await this.knowledgeSearch.searchRelevantChunks(command.message, topK, minScore);

    const answer = await this.aiCompletion.generateStructuredAnswer({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: command.message,
      retrievedChunks,
    });

    return { answer };
  }
}
