import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { createEmbedding } from '../../../shared/embeddings-client.js';
import { requireEnv } from '../../../shared/env.js';
import type { IKnowledgeSearchPort, RetrievedChunk } from '../domain/ports/IKnowledgeSearchPort.js';

interface KnowledgeChunkRow extends Record<string, unknown> {
  document_code: string;
  document_title: string;
  source_url: string;
  office: RetrievedChunk['office'];
  content: string;
  similarity_score: number;
}

@Injectable()
export class PgvectorKnowledgeSearchAdapter implements IKnowledgeSearchPort {
  async searchRelevantChunks(queryText: string, topK: number, minScore: number): Promise<RetrievedChunk[]> {
    const queryEmbedding = await createEmbedding(queryText, {
      baseUrl: requireEnv('EMBEDDINGS_BASE_URL'),
      apiKey: requireEnv('EMBEDDINGS_API_KEY'),
      model: requireEnv('EMBEDDINGS_MODEL'),
    });
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;

    // Consulta de referencia: docs/02-modelo-de-datos.md §4. Solo status = 'approved' (P0.3).
    const result = await db.execute<KnowledgeChunkRow>(sql`
      SELECT
        d.code AS document_code,
        d.title AS document_title,
        d.source_url AS source_url,
        d.office AS office,
        c.content AS content,
        1 - (c.embedding <=> ${vectorLiteral}::vector) AS similarity_score
      FROM knowledge_chunks c
      JOIN knowledge_documents d ON d.id = c.document_id
      WHERE d.status = 'approved'
        AND 1 - (c.embedding <=> ${vectorLiteral}::vector) >= ${minScore}
      ORDER BY c.embedding <=> ${vectorLiteral}::vector
      LIMIT ${topK}
    `);

    return result.rows.map((row) => ({
      documentCode: row.document_code,
      documentTitle: row.document_title,
      sourceUrl: row.source_url,
      office: row.office,
      content: row.content,
      similarityScore: Number(row.similarity_score),
    }));
  }
}
