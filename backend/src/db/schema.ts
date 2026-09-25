import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  vector,
} from 'drizzle-orm/pg-core';

/**
 * drizzle-orm no tiene tipo nativo para tsvector; se define como custom type
 * de solo lectura (columna GENERATED ALWAYS, nunca se escribe desde la app).
 */
const tsvectorEs = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const documentStatus = ['pending_review', 'approved', 'rejected'] as const;
export type DocumentStatus = (typeof documentStatus)[number];

export const editors = pgTable('editors', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const knowledgeDocuments = pgTable(
  'knowledge_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    title: varchar('title', { length: 300 }).notNull(),
    summary: text('summary').notNull(),
    // Texto completo de documentos largos (PDF vía n8n). Se trocea recién al aprobar
    // (docs/03-scraper-y-rag.md §4.2); null en fichas curadas cortas.
    fullText: text('full_text'),
    requirements: jsonb('requirements').notNull().default([]),
    office: jsonb('office'),
    sourceUrl: text('source_url').notNull(),
    capturedAt: date('captured_at').notNull(),
    validUntil: date('valid_until'),
    status: varchar('status', { length: 20 }).notNull().default('pending_review'),
    isFictional: boolean('is_fictional').notNull().default(false),
    reviewedBy: uuid('reviewed_by').references(() => editors.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_knowledge_documents_status').on(table.status),
    check(
      'knowledge_documents_status_check',
      sql`${table.status} IN ('pending_review', 'approved', 'rejected')`,
    ),
  ],
);

export const knowledgeChunks = pgTable(
  'knowledge_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    tokenCount: integer('token_count').notNull(),
    // bge-m3 = 1024 dimensiones (docs/02-modelo-de-datos.md §3.2, debe coincidir con EMBEDDINGS_DIM)
    embedding: vector('embedding', { dimensions: 1024 }).notNull(),
    searchVector: tsvectorEs('search_vector').generatedAlwaysAs(
      sql`to_tsvector('spanish', content)`,
    ),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_knowledge_chunks_document').on(table.documentId),
    uniqueIndex('idx_knowledge_chunks_content_hash').on(table.contentHash),
    index('idx_knowledge_chunks_embedding_hnsw')
      .using('hnsw', table.embedding.op('vector_cosine_ops'))
      .with({ m: 16, ef_construction: 64 }),
    index('idx_knowledge_chunks_fts').using('gin', table.searchVector),
  ],
);
