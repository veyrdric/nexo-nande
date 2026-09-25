import { Injectable, Logger } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';

interface FallbackDocument {
  file: string;
  text: string;
}

const MAX_KNOWLEDGE_CHARS = 12_000;

const INSTITUTIONS: Record<string, string> = {
  IPF: 'Instituto Politécnico Formosa (IPF)',
};

const LABELS: Record<string, string> = {
  title: 'Título',
  summary: 'Resumen',
  requirements: 'Requisitos',
  office: 'Dónde',
  schedule: 'Horario',
  source_url: 'Fuente',
  valid_until: 'Vigente hasta',
};

@Injectable()
export class KnowledgeFallbackService {
  private readonly logger = new Logger(KnowledgeFallbackService.name);
  private documents: FallbackDocument[] = [];
  private readonly knowledgeDir: string;

  constructor() {
    this.knowledgeDir = path.resolve(process.cwd(), 'knowledge');
    this.loadDocuments();
  }

  private jsonToText(doc: Record<string, unknown>): string | null {
    if (doc.status && doc.status !== 'approved') return null;
    const lines: string[] = [];
    if (doc.is_fictional) lines.push('[DATO FICTICIO DE DEMOSTRACIÓN]');
    const code = String(doc.code || '');
    const prefix = code.split('-')[0];
    const institution = INSTITUTIONS[prefix];
    if (institution) lines.push(`Institución: ${institution}`);
    if (code.includes('-CARRERA-')) lines.push('Tipo: carrera');

    for (const [key, label] of Object.entries(LABELS)) {
      const value = doc[key];
      if (value == null || (Array.isArray(value) && value.length === 0)) continue;
      lines.push(`${label}: ${Array.isArray(value) ? value.join('; ') : String(value)}`);
    }
    return lines.join('\n');
  }

  private loadDocuments(): void {
    if (!fs.existsSync(this.knowledgeDir)) {
      this.documents = [];
      return;
    }

    try {
      this.documents = fs
        .readdirSync(this.knowledgeDir)
        .filter((f) => /\.(md|txt|json)$/i.test(f))
        .sort()
        .map((file) => {
          const raw = fs.readFileSync(path.join(this.knowledgeDir, file), 'utf8');
          try {
            const text = file.endsWith('.json')
              ? this.jsonToText(JSON.parse(raw))
              : raw.trim();
            return text ? { file, text } : null;
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`No se pudo leer ${file}: ${msg}`);
            return null;
          }
        })
        .filter((d): d is FallbackDocument => d !== null);

      this.logger.log(`Base de conocimiento: ${this.documents.length} documento(s) cargado(s).`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error cargando knowledgeDir: ${msg}`);
      this.documents = [];
    }
  }

  documentCount(): number {
    return this.documents.length;
  }

  private tokenize(text: string): Set<string> {
    return new Set(
      text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .split(/[^a-z0-9ñ]+/)
        .filter((w) => w.length > 3),
    );
  }

  getContext(question: string): string {
    const total = this.documents.reduce((sum, d) => sum + d.text.length, 0);
    let selected = this.documents;

    if (total > MAX_KNOWLEDGE_CHARS) {
      const q = this.tokenize(question);
      const scored = this.documents
        .map((d) => {
          const words = this.tokenize(d.text);
          let score = 0;
          for (const w of q) if (words.has(w)) score++;
          return { d, score };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score);

      selected = [];
      let used = 0;
      for (const { d } of scored) {
        if (used + d.text.length > MAX_KNOWLEDGE_CHARS) break;
        selected.push(d);
        used += d.text.length;
      }
    }

    return selected.map((d) => `### ${d.file}\n${d.text}`).join('\n\n');
  }
}
