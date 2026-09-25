import { Injectable } from '@nestjs/common';

const DEDUP_WINDOW_MS = 5 * 60 * 1000; // alcanza para los reintentos de Meta

/**
 * Deduplica por messages[].id (Meta reintenta el mismo evento, docs/02-contratos.md §1.2).
 * TODO: mover a Redis cuando exista session-memory; en memoria alcanza para una sola instancia.
 */
@Injectable()
export class MessageDedupService {
  private readonly seen = new Map<string, number>();

  /** true si ya se procesó este id. Si es la primera vez, lo marca como visto. */
  isDuplicate(messageId: string): boolean {
    this.cleanup();
    if (this.seen.has(messageId)) return true;
    this.seen.set(messageId, Date.now());
    return false;
  }

  private cleanup(): void {
    const cutoff = Date.now() - DEDUP_WINDOW_MS;
    for (const [id, seenAt] of this.seen) {
      if (seenAt < cutoff) this.seen.delete(id);
    }
  }
}
