import { Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ConfigService } from '../../core/config.service.js';

export const STATUSES = ['pending_review', 'approved', 'rejected'] as const;
export type DocumentStatus = (typeof STATUSES)[number];

export interface DocumentMetadata {
  code: string;
  title: string;
  sourceUrl: string;
  isFictional?: boolean;
  status: DocumentStatus;
  chunkCount?: number;
  indexedAt?: string;
  contentHash?: string;
}

export interface Chunk {
  code: string;
  index: number;
  text: string;
  embedding: number[];
}

export interface SearchResult extends Chunk {
  score: number;
  doc: DocumentMetadata;
}

interface StoreData {
  documents: Record<string, DocumentMetadata>;
  chunks: Chunk[];
}

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);
  private store: StoreData = { documents: {}, chunks: [] };
  private loadedMtime = 0;
  private readonly storePath: string;

  constructor(private readonly config: ConfigService) {
    this.storePath = path.resolve(this.config.RAG_STORE_PATH);
    this.load();
  }

  private load(): void {
    try {
      if (!fs.existsSync(this.storePath)) {
        return;
      }
      const { mtimeMs } = fs.statSync(this.storePath);
      if (mtimeMs === this.loadedMtime) return;
      this.store = JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
      this.loadedMtime = mtimeMs;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`No se pudo leer el vector store: ${message}`);
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.storePath), { recursive: true });
    const tmp = `${this.storePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.store));
    fs.renameSync(tmp, this.storePath);
    this.loadedMtime = fs.statSync(this.storePath).mtimeMs;
  }

  upsertDocument(
    doc: { code: string; title: string; sourceUrl: string; isFictional?: boolean; status?: string },
    chunks: Array<{ text: string; embedding: number[] }>,
  ): DocumentStatus {
    this.load();
    const contentHash = crypto
      .createHash('sha256')
      .update(chunks.map((c) => c.text).join('\n'))
      .digest('hex');

    const previous = this.store.documents[doc.code];
    const incoming: DocumentStatus = STATUSES.includes(doc.status as DocumentStatus)
      ? (doc.status as DocumentStatus)
      : 'pending_review';

    const keepApproved = previous?.status === 'approved' && previous.contentHash === contentHash;
    const finalStatus: DocumentStatus = keepApproved ? 'approved' : incoming;

    this.store.documents[doc.code] = {
      code: doc.code,
      title: doc.title,
      sourceUrl: doc.sourceUrl,
      isFictional: Boolean(doc.isFictional),
      status: finalStatus,
      contentHash,
      chunkCount: chunks.length,
      indexedAt: new Date().toISOString(),
    };

    this.store.chunks = this.store.chunks.filter((c) => c.code !== doc.code);
    chunks.forEach((c, index) => {
      this.store.chunks.push({
        code: doc.code,
        index,
        text: c.text,
        embedding: c.embedding,
      });
    });

    this.save();
    return finalStatus;
  }

  listDocuments(): DocumentMetadata[] {
    this.load();
    return Object.values(this.store.documents);
  }

  getDocument(code: string): DocumentMetadata | undefined {
    this.load();
    return this.store.documents[code];
  }

  setStatus(code: string, status: string): boolean {
    this.load();
    if (!this.store.documents[code] || !STATUSES.includes(status as DocumentStatus)) {
      return false;
    }
    this.store.documents[code].status = status as DocumentStatus;
    this.save();
    return true;
  }

  deleteDocument(code: string): boolean {
    this.load();
    if (!this.store.documents[code]) return false;
    delete this.store.documents[code];
    this.store.chunks = this.store.chunks.filter((c) => c.code !== code);
    this.save();
    return true;
  }

  approvedChunkCount(): number {
    this.load();
    return this.store.chunks.filter(
      (c) => this.store.documents[c.code]?.status === 'approved',
    ).length;
  }

  private cosine(a: number[], b: number[]): number {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
  }

  search(
    queryEmbedding: number[],
    k: number = this.config.RAG_TOP_K,
    minScore: number = this.config.RAG_MIN_SCORE,
  ): SearchResult[] {
    this.load();
    return this.store.chunks
      .filter((c) => this.store.documents[c.code]?.status === 'approved')
      .map((c) => ({
        ...c,
        score: this.cosine(queryEmbedding, c.embedding),
        doc: this.store.documents[c.code],
      }))
      .filter((c) => c.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}
