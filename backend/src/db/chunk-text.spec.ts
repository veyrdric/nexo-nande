import { chunkText } from './chunk-text.js';

describe('chunkText', () => {
  it('devuelve un solo chunk si el texto entra en la ventana', () => {
    expect(chunkText('  Tecnicatura en Software, dos años.  ')).toEqual(['Tecnicatura en Software, dos años.']);
  });

  it('devuelve vacío para texto vacío', () => {
    expect(chunkText('   ')).toEqual([]);
  });

  it('trocea textos largos con solapamiento y sin partir palabras', () => {
    const words = Array.from({ length: 2000 }, (_, i) => `palabra${i}`);
    const chunks = chunkText(words.join(' '));

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(3200);
      // Cada chunk empieza y termina en una palabra completa.
      expect(chunk).toMatch(/^palabra\d+(\s|$)/);
      expect(chunk).toMatch(/palabra\d+$/);
    }
    // Hay solapamiento: el final de un chunk reaparece al principio del siguiente.
    const lastWord = chunks[0].split(' ').at(-1)!;
    expect(chunks[1]).toContain(lastWord);
    // No se pierde contenido: la última palabra aparece en el último chunk.
    expect(chunks.at(-1)).toContain('palabra1999');
  });
});
