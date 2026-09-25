import type { StructuredAnswer } from './ports/IAiCompletionPort.js';
import { llmStructuredAnswerSchema } from './structured-answer.schema.js';

/**
 * Valida el JSON crudo del LLM contra el esquema y reglas de negocio que el JSON
 * Schema no puede expresar (docs/02-contratos.md §3, docs/03-scraper-y-rag.md §4.3):
 *  1. knows_answer=false exige missing_info_note != null.
 *  2. knows_answer=true exige al menos una fuente (no se confía ciegamente en el
 *     flag del propio LLM si dice que sabe pero no cita nada).
 *  3. Todo dominio en sources tiene que venir del CONTEXTO recuperado (retrievedSourceOrigins).
 *     Encontrado en pruebas reales: el LLM puede decir knows_answer=false y aun así
 *     inventar una fuente plausible que no existe en la base — se rechaza igual.
 *     Se compara por dominio (origin), no por URL exacta: el LLM a veces devuelve
 *     la URL acortada a la raíz del sitio en vez de la ruta completa (visto en
 *     pruebas reales con llama3.2:3b) — eso es válido, no es una alucinación.
 * Devuelve null si algo no cumple (el caller decide reintentar o usar el fallback).
 */
export function validateLlmResponse(
  raw: unknown,
  retrievedSourceOrigins: ReadonlySet<string>,
): StructuredAnswer | null {
  const parsed = llmStructuredAnswerSchema.safeParse(raw);
  if (!parsed.success) return null;

  const { answer_markdown, sources, knows_answer, missing_info_note } = parsed.data;

  if (!knows_answer && missing_info_note === null) return null;
  if (knows_answer && sources.length === 0) return null;
  if (sources.some((source) => !isKnownOrigin(source.url, retrievedSourceOrigins))) return null;

  return {
    answerMarkdown: answer_markdown,
    sources,
    knowsAnswer: knows_answer,
    missingInfoNote: missing_info_note,
  };
}

function isKnownOrigin(url: string, allowedOrigins: ReadonlySet<string>): boolean {
  try {
    return allowedOrigins.has(new URL(url).origin);
  } catch {
    return false;
  }
}
