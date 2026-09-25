// docs/03-scraper-y-rag.md §4.2: ventana de 800 tokens con 150 de solapamiento,
// token estimado como 4 caracteres (misma aproximación que token_count).
const CHARS_PER_TOKEN = 4;
const WINDOW_CHARS = 800 * CHARS_PER_TOKEN;
const OVERLAP_CHARS = 150 * CHARS_PER_TOKEN;

export function chunkText(text: string): string[] {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= WINDOW_CHARS) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + WINDOW_CHARS, clean.length);
    if (end < clean.length) {
      // Cortar en el último salto de línea o espacio de la ventana, para no partir palabras.
      const lastBreak = Math.max(clean.lastIndexOf('\n', end), clean.lastIndexOf(' ', end));
      if (lastBreak > start + OVERLAP_CHARS) end = lastBreak;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    // El solapamiento también arranca al principio de una palabra.
    start = end - OVERLAP_CHARS;
    while (start < end && !/\s/.test(clean[start - 1])) start++;
  }
  return chunks;
}
