import { Inject, Injectable } from '@nestjs/common';
import { AI_COMPLETION_PORT, type IAiCompletionPort, type StructuredAnswer } from '../../../ai-gateway/index.js';
import { KNOWLEDGE_SEARCH_PORT, type IKnowledgeSearchPort } from '../../../knowledge-retrieval/index.js';
import {
  SESSION_MEMORY_PORT,
  type ISessionMemoryPort,
  type SessionTurn,
} from '../../../session-memory/index.js';
import { requireEnv } from '../../../../shared/env.js';
import { SYSTEM_PROMPT } from '../SystemPrompt.js';

/**
 * Versión de ResolveWhatsAppInquiryUseCase (docs/02-contratos.md §2) sin audio (P1),
 * con memoria de sesión en Redis. sessionKey: hash del teléfono (WhatsApp) o sessionId (web).
 */
export interface ResolveInquiryCommand {
  sessionKey: string;
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
    @Inject(SESSION_MEMORY_PORT) private readonly sessionMemory: ISessionMemoryPort,
  ) {}

  async execute(command: ResolveInquiryCommand): Promise<ResolveInquiryResult> {
    const topK = Number(requireEnv('RAG_TOP_K'));
    const minScore = Number(requireEnv('RAG_MIN_SCORE'));
    const maxTurns = Number(requireEnv('SESSION_MAX_TURNS'));

    // Se llama al LLM aunque no haya chunks: el prompt ya instruye a decir "no sé"
    // en ese caso (docs/03-scraper-y-rag.md §4.3).
    const [retrievedChunks, recentTurns] = await Promise.all([
      this.knowledgeSearch.searchRelevantChunks(command.message, topK, minScore),
      this.sessionMemory.getRecentTurns(command.sessionKey, maxTurns),
    ]);

    const answer = await this.aiCompletion.generateStructuredAnswer({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: buildUserMessageWithHistory(recentTurns, command.message),
      retrievedChunks,
    });

    await this.sessionMemory.appendTurn(command.sessionKey, 'user', command.message);
    await this.sessionMemory.appendTurn(command.sessionKey, 'assistant', answer.answerMarkdown);

    return { answer };
  }
}

function buildUserMessageWithHistory(turns: SessionTurn[], message: string): string {
  if (turns.length === 0) return message;

  const history = turns.map((turn) => `${turn.role === 'user' ? 'Ciudadano' : 'Asistente'}: ${turn.text}`).join('\n');
  return `Historial reciente de la conversación:\n${history}\n\nPregunta actual: ${message}`;
}
