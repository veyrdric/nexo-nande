// docs/02-contratos.md §2
export interface RetrievedChunk {
  documentCode: string;
  documentTitle: string;
  sourceUrl: string;
  office: { name: string; address: string; hours: string; locality: string } | null;
  content: string;
  similarityScore: number;
}

export const KNOWLEDGE_SEARCH_PORT = Symbol('IKnowledgeSearchPort');

export interface IKnowledgeSearchPort {
  /** Búsqueda densa en pgvector. Filtra siempre status = 'approved'. */
  searchRelevantChunks(queryText: string, topK: number, minScore: number): Promise<RetrievedChunk[]>;
}
