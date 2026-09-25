import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  HttpException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import crypto from 'node:crypto';
import { ConfigService } from '../../core/config.service.js';
import { VectorStoreService, STATUSES, DocumentStatus } from './vector-store.service.js';

const CODE_RE = /^[A-Z0-9][A-Z0-9-]{2,80}$/;

const safeEqual = (a: string, b: string): boolean => {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

interface IngestChunk {
  text: string;
  embedding: number[];
}

interface IngestDocument {
  code: string;
  title: string;
  sourceUrl: string;
  capturedAt?: string;
  isFictional?: boolean;
  status?: string;
  chunks: IngestChunk[];
}

@Controller('api/rag')
export class RagController {
  constructor(
    private readonly config: ConfigService,
    private readonly vectorStore: VectorStoreService,
  ) {}

  private verifySecret(secretHeader?: string): void {
    if (!this.config.RAG_INGEST_SECRET) {
      throw new HttpException('RAG_INGEST_SECRET no configurado', HttpStatus.SERVICE_UNAVAILABLE);
    }
    if (!secretHeader || !safeEqual(secretHeader, this.config.RAG_INGEST_SECRET)) {
      throw new HttpException('Secreto inválido', HttpStatus.UNAUTHORIZED);
    }
  }

  private validateDocument(d: IngestDocument): string | null {
    if (!d || typeof d !== 'object') return 'documento inválido';
    if (typeof d.code !== 'string' || !CODE_RE.test(d.code)) {
      return 'code inválido (MAYÚSCULAS, números y guiones)';
    }
    if (typeof d.title !== 'string' || !d.title.trim()) return `${d.code}: title obligatorio`;
    if (typeof d.sourceUrl !== 'string') return `${d.code}: sourceUrl obligatorio`;
    if (!Array.isArray(d.chunks) || d.chunks.length === 0) return `${d.code}: sin chunks`;
    for (const c of d.chunks) {
      if (typeof c.text !== 'string' || !Array.isArray(c.embedding) || c.embedding.length < 64) {
        return `${d.code}: chunk sin texto o sin embedding`;
      }
    }
    return null;
  }

  @Post('ingest')
  ingest(
    @Headers('x-ingest-secret') secretHeader: string,
    @Body() body: { documents?: IngestDocument[] },
  ) {
    this.verifySecret(secretHeader);
    const documents = body?.documents;
    if (!Array.isArray(documents) || documents.length === 0) {
      throw new HttpException('documents[] es obligatorio', HttpStatus.BAD_REQUEST);
    }

    const errors = documents.map((d) => this.validateDocument(d)).filter(Boolean);
    if (errors.length) {
      throw new HttpException({ error: 'Lote inválido', details: errors }, HttpStatus.BAD_REQUEST);
    }

    const results = documents.map((d) => ({
      code: d.code,
      chunks: d.chunks.length,
      status: this.vectorStore.upsertDocument(
        {
          code: d.code,
          title: d.title.trim(),
          sourceUrl: d.sourceUrl,
          isFictional: d.isFictional === true,
          status: d.status,
        },
        d.chunks,
      ),
    }));

    return { ingested: results };
  }

  @Get('documents')
  listDocuments(@Headers('x-ingest-secret') secretHeader: string) {
    this.verifySecret(secretHeader);
    return {
      documents: this.vectorStore.listDocuments().map(
        ({ code, title, sourceUrl, status, chunkCount, indexedAt }) => ({
          code,
          title,
          sourceUrl,
          status,
          chunkCount,
          indexedAt,
        }),
      ),
    };
  }

  @Post('documents/:code/status')
  setStatus(
    @Headers('x-ingest-secret') secretHeader: string,
    @Param('code') code: string,
    @Body() body: { status: string },
  ) {
    this.verifySecret(secretHeader);
    const { status } = body || {};
    if (!STATUSES.includes(status as DocumentStatus)) {
      throw new HttpException(
        `status debe ser: ${STATUSES.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!this.vectorStore.setStatus(code, status)) {
      throw new HttpException('Documento no encontrado', HttpStatus.NOT_FOUND);
    }
    return { code, status };
  }

  @Delete('documents/:code')
  @HttpCode(204)
  deleteDocument(
    @Headers('x-ingest-secret') secretHeader: string,
    @Param('code') code: string,
  ) {
    this.verifySecret(secretHeader);
    if (!this.vectorStore.deleteDocument(code)) {
      throw new HttpException('Documento no encontrado', HttpStatus.NOT_FOUND);
    }
  }
}
