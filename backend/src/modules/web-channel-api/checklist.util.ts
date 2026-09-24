/** Extrae las viñetas ("- algo") de un markdown para la tarjeta "Qué llevar" (docs/00-alcance-mvp.md P1.2). */
export function extractChecklist(answerMarkdown: string): string[] {
  return answerMarkdown
    .split('\n')
    .map((line) => /^\s*-\s+(.+)$/.exec(line)?.[1])
    .filter((item): item is string => Boolean(item));
}
