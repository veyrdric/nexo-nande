import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { curatedDocumentSchema } from './curated-document.schema.js';
import { db, pool } from './client.js';
import { buildChunkTexts } from './document-content.js';
import { replaceDocumentChunks } from './index-document-chunks.js';
import { knowledgeDocuments } from './schema.js';

const CURADO_DIR = path.resolve(import.meta.dirname, '../../../scraper/data/curado');

async function main() {
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
    // Si una ficha deja de estar aprobada, se le borran los chunks.
    if (doc.status !== 'approved') {
      await replaceDocumentChunks(documentId, []);
      console.log('  sin chunks: status != approved');
      continue;
    }

    const count = await replaceDocumentChunks(
      documentId,
      buildChunkTexts({ ...doc, fullText: null }),
    );
    console.log(`  ${count} chunk(s) generado(s)`);
  }
}

main()
  .then(() => pool.end())
  .catch((error: unknown) => {
    console.error(error);
    return pool.end().finally(() => process.exit(1));
  });
