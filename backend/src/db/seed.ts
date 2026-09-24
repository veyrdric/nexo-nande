import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { curatedDocumentSchema, type CuratedDocument } from './curated-document.schema.js';
import { db, pool } from './client.js';
import { createEmbedding } from '../shared/embeddings-client.js';
import { requireEnv } from '../shared/env.js';
import { knowledgeChunks, knowledgeDocuments } from './schema.js';

const CURADO_DIR = path.resolve(import.meta.dirname, '../../../scraper/data/curado');

/** Fichas curadas son cortas: un solo chunk con todo el contenido relevante (docs/03-scraper-y-rag.md §4.2). */
function buildChunkContent(doc: CuratedDocument): string {
  const parts = [doc.title, doc.summary];
  if (doc.requirements.length > 0) {
    parts.push(`Requisitos: ${doc.requirements.join('; ')}`);
  }
  if (doc.office) {
    parts.push(
      `Sede: ${doc.office.name}, ${doc.office.address}. Horario: ${doc.office.hours}. Localidad: ${doc.office.locality}.`,
    );
  }
  return parts.join('\n\n');
}

async function main() {
  const embeddingsConfig = {
    baseUrl: requireEnv('EMBEDDINGS_BASE_URL'),
    apiKey: requireEnv('EMBEDDINGS_API_KEY'),
    model: requireEnv('EMBEDDINGS_MODEL'),
  };
  const expectedDim = Number(requireEnv('EMBEDDINGS_DIM'));

  const entries = await readdir(CURADO_DIR).catch(() => []);
  const files = entries.filter((f) => f.endsWith('.json'));

  if (files.length === 0) {
    console.log(`No hay fichas en ${CURADO_DIR} (curaduría pendiente, docs/sprint/GUIA-CURADURIA-IPF.md).`);
    return;
  }

  for (const file of files) {
    const raw: unknown = JSON.parse(await readFile(path.join(CURADO_DIR, file), 'utf-8'));
    const parsed = curatedDocumentSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(`✗ ${file}: JSON inválido`);
      console.error(parsed.error.flatten());
      continue;
    }
    const doc = parsed.data;

    const [{ id: documentId }] = await db
      .insert(knowledgeDocuments)
      .values({
        code: doc.code,
        title: doc.title,
        summary: doc.summary,
        requirements: doc.requirements,
        office: doc.office,
        sourceUrl: doc.source_url,
        capturedAt: doc.captured_at,
        validUntil: doc.valid_until,
        status: doc.status,
        isFictional: doc.is_fictional,
      })
      .onConflictDoUpdate({
        target: knowledgeDocuments.code,
        set: {
          title: doc.title,
          summary: doc.summary,
          requirements: doc.requirements,
          office: doc.office,
          sourceUrl: doc.source_url,
          capturedAt: doc.captured_at,
          validUntil: doc.valid_until,
          status: doc.status,
          isFictional: doc.is_fictional,
          updatedAt: new Date(),
        },
      })
      .returning({ id: knowledgeDocuments.id });

    console.log(`✓ ${doc.code} (${doc.status}${doc.is_fictional ? ', FICTICIO' : ''})`);

    // Solo se gasta cuota de EMBEDDINGS_* en fichas aprobadas (docs/03-scraper-y-rag.md §3.1).
    if (doc.status !== 'approved') {
      console.log('  sin chunks: status != approved');
      continue;
    }

    await db.delete(knowledgeChunks).where(eq(knowledgeChunks.documentId, documentId));

    const content = buildChunkContent(doc);
    const embedding = await createEmbedding(content, embeddingsConfig);
    if (embedding.length !== expectedDim) {
      throw new Error(
        `${doc.code}: el embedding devolvió ${embedding.length} dimensiones, se esperaban ${expectedDim} (EMBEDDINGS_DIM)`,
      );
    }

    await db.insert(knowledgeChunks).values({
      documentId,
      chunkIndex: 0,
      content,
      tokenCount: Math.ceil(content.length / 4),
      embedding,
      contentHash: createHash('sha256').update(content).digest('hex'),
    });

    console.log(`  chunk generado (${embedding.length} dim)`);
  }
}

main()
  .then(() => pool.end())
  .catch((error: unknown) => {
    console.error(error);
    return pool.end().finally(() => process.exit(1));
  });
