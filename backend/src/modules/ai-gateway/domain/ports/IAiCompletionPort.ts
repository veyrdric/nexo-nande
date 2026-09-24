import type { RetrievedChunk } from '../../../knowledge-retrieval/index.js';

// docs/02-contratos.md §2-3
export interface StructuredAnswerRequest {
  systemPrompt: string;
  userMessage: string;
  retrievedChunks: RetrievedChunk[];
}

export interface StructuredAnswer {
  answerMarkdown: string;
  sources: Array<{ title: string; url: string }>;
  knowsAnswer: boolean;
  missingInfoNote: string | null;
}

export const AI_COMPLETION_PORT = Symbol('IAiCompletionPort');

export interface IAiCompletionPort {
  /** Devuelve StructuredAnswer ya validado contra el JSON Schema de docs/02-contratos.md §3. */
  generateStructuredAnswer(request: StructuredAnswerRequest): Promise<StructuredAnswer>;
}
