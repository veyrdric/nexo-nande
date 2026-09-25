import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createEmbedding } from '../shared/embeddings-client.js';
import { requireEnv } from '../shared/env.js';
import { db } from './client.js';
import { knowledgeChunks } from './schema.js';

/**
 * Reemplaza los chunks de un documento: calcula los embeddings con EMBEDDINGS_*
 * y los inserta. Todos los embeddings se calculan antes de tocar la base, así un
 * fallo a mitad de camino no deja al documento sin chunks.
 */
export async function replaceDocumentChunks(documentId: string, chunkTexts: string[]): Promise<number> {
  const rows: Array<typeof knowledgeChunks.$inferInsert> = [];

  if (chunkTexts.length > 0) {
    const config = {
      baseUrl: requireEnv('EMBEDDINGS_BASE_URL'),
      apiKey: requireEnv('EMBEDDINGS_API_KEY'),
      model: requireEnv('EMBEDDINGS_MODEL'),
    };
    const expectedDim = Number(requireEnv('EMBEDDINGS_DIM'));

    for (const [chunkIndex, content] of chunkTexts.entries()) {
      const embedding = await createEmbedding(content, config);
      if (embedding.length !== expectedDim) {
        throw new Error(
          `El embedding devolvió ${embedding.length} dimensiones, se esperaban ${expectedDim} (EMBEDDINGS_DIM)`,
        );
      }
      rows.push({
        documentId,
        chunkIndex,
        content,
        tokenCount: Math.ceil(content.length / 4),
        embedding,
        contentHash: createHash('sha256').update(content).digest('hex'),
      });
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(knowledgeChunks).where(eq(knowledgeChunks.documentId, documentId));
    if (rows.length > 0) {
      await tx.insert(knowledgeChunks).values(rows);
    }
  });

  return rows.length;
}
