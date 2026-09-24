import type { StructuredAnswer } from './ports/IAiCompletionPort.js';
import { llmStructuredAnswerSchema } from './structured-answer.schema.js';

/**
 * Valida el JSON crudo del LLM contra el esquema y dos reglas de negocio que
 * el JSON Schema no puede expresar (docs/02-contratos.md §3, docs/03-scraper-y-rag.md §4.3):
 *  1. knows_answer=false exige missing_info_note != null.
 *  2. knows_answer=true exige al menos una fuente (anti-alucinación: no se confía
 *     ciegamente en el flag del propio LLM si dice que sabe pero no cita nada).
 * Devuelve null si algo no cumple (el caller decide reintentar o usar el fallback).
 */
export function validateLlmResponse(raw: unknown): StructuredAnswer | null {
  const parsed = llmStructuredAnswerSchema.safeParse(raw);
  if (!parsed.success) return null;

  const { answer_markdown, sources, knows_answer, missing_info_note } = parsed.data;

  if (!knows_answer && missing_info_note === null) return null;
  if (knows_answer && sources.length === 0) return null;

  return {
    answerMarkdown: answer_markdown,
    sources,
    knowsAnswer: knows_answer,
    missingInfoNote: missing_info_note,
  };
}
