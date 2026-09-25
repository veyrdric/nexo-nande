import { eq } from 'drizzle-orm';
import { db, pool } from './client.js';
import { buildChunkTexts } from './document-content.js';
import { replaceDocumentChunks } from './index-document-chunks.js';
import { knowledgeDocuments } from './schema.js';

/**
 * Revisión humana de documentos pending_review (lo que entra por n8n o el scraper),
 * mientras no exista el panel de carga (P2.2). Nada entra al RAG sin pasar por acá.
 *
 *   npm run db:review -- list
 *   npm run db:review -- show <CODE>
 *   npm run db:review -- approve <CODE>
 *   npm run db:review -- reject <CODE>
 */
const USAGE = 'Uso: npm run db:review -- list | show <CODE> | approve <CODE> | reject <CODE>';

async function findByCode(code: string) {
  const [doc] = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.code, code));
  if (!doc) throw new Error(`No existe un documento con code ${code}`);
  return doc;
}

async function list() {
  const pending = await db
    .select({
      code: knowledgeDocuments.code,
      title: knowledgeDocuments.title,
      sourceUrl: knowledgeDocuments.sourceUrl,
      createdAt: knowledgeDocuments.createdAt,
    })
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.status, 'pending_review'));

  if (pending.length === 0) {
    console.log('No hay documentos pendientes de revisión.');
    return;
  }
  for (const doc of pending) {
    console.log(`${doc.code}  |  ${doc.title}  |  ${doc.sourceUrl}  |  ${doc.createdAt.toISOString()}`);
  }
}

async function show(code: string) {
  const doc = await findByCode(code);
  console.log(`code:        ${doc.code}`);
  console.log(`estado:      ${doc.status}${doc.isFictional ? ' (FICTICIO)' : ''}`);
  console.log(`título:      ${doc.title}`);
  console.log(`fuente:      ${doc.sourceUrl} (capturado ${doc.capturedAt})`);
  console.log(`requisitos:  ${JSON.stringify(doc.requirements)}`);
  console.log(`\n--- contenido que va a entrar al RAG ---\n${doc.fullText ?? doc.summary}`);
}

async function approve(code: string) {
  const doc = await findByCode(code);
  if (doc.status === 'approved') {
    console.log(`${code} ya estaba aprobado.`);
    return;
  }

  // Primero se indexa y recién después se cambia el estado: si falla, sigue pendiente.
  const count = await replaceDocumentChunks(
    doc.id,
    buildChunkTexts({
      title: doc.title,
      summary: doc.summary,
      requirements: doc.requirements as string[],
      office: doc.office as Parameters<typeof buildChunkTexts>[0]['office'],
      fullText: doc.fullText,
    }),
  );
  await db
    .update(knowledgeDocuments)
    .set({ status: 'approved', reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(knowledgeDocuments.id, doc.id));

  console.log(`✓ ${code} aprobado: ${count} chunk(s) en el RAG.`);
}

async function reject(code: string) {
  const doc = await findByCode(code);
  await replaceDocumentChunks(doc.id, []);
  await db
    .update(knowledgeDocuments)
    .set({ status: 'rejected', reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(knowledgeDocuments.id, doc.id));
  console.log(`✓ ${code} rechazado (fuera del RAG).`);
}

async function main() {
  const [command, code] = process.argv.slice(2);

  if (command === 'list') return list();
  if (!code) throw new Error(USAGE);
  if (command === 'show') return show(code);
  if (command === 'approve') return approve(code);
  if (command === 'reject') return reject(code);
  throw new Error(USAGE);
}

main()
  .then(() => pool.end())
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    return pool.end().finally(() => process.exit(1));
  });
