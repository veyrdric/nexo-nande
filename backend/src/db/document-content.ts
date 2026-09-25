import { chunkText } from './chunk-text.js';

interface Office {
  name?: string;
  address?: string;
  hours?: string;
  locality?: string;
}

export interface IndexableDocument {
  title: string;
  summary: string;
  requirements: string[];
  office: Office | null;
  fullText: string | null;
}

/**
 * Textos a indexar de un documento. Fichas cortas: un solo chunk con todo el
 * contenido relevante. Documentos largos (fullText, PDF): troceados, cada
 * chunk con el título adelante para que no pierda el contexto al recuperarse solo.
 */
export function buildChunkTexts(doc: IndexableDocument): string[] {
  if (doc.fullText) {
    return chunkText(doc.fullText).map((chunk) => `${doc.title}\n\n${chunk}`);
  }

  const parts = [doc.title, doc.summary];
  if (doc.requirements.length > 0) {
    parts.push(`Requisitos: ${doc.requirements.join('; ')}`);
  }
  if (doc.office) {
    const { name, address, hours, locality } = doc.office;
    parts.push(
      [
        name && `Sede: ${name}`,
        address && `Dirección: ${address}`,
        hours && `Horario: ${hours}`,
        locality && `Localidad: ${locality}`,
      ]
        .filter(Boolean)
        .join('. '),
    );
  }
  return [parts.join('\n\n')];
}
