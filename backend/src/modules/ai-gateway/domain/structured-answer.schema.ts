import { z } from 'zod';

/** JSON Schema de docs/02-contratos.md §3, tal como lo devuelve el LLM (snake_case). */
export const llmStructuredAnswerSchema = z
  .object({
    answer_markdown: z.string().min(1),
    sources: z.array(
      z.object({ title: z.string(), url: z.string() }).strict(),
    ),
    knows_answer: z.boolean(),
    missing_info_note: z.string().nullable(),
  })
  .strict();

export type LlmStructuredAnswer = z.infer<typeof llmStructuredAnswerSchema>;
