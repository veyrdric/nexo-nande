// docs/02-contratos.md §2. Clave: hash del teléfono (WhatsApp) o sessionId UUID (web).
export interface SessionTurn {
  role: 'user' | 'assistant';
  text: string;
}

export const SESSION_MEMORY_PORT = Symbol('ISessionMemoryPort');

export interface ISessionMemoryPort {
  getRecentTurns(sessionKey: string, maxTurns: number): Promise<SessionTurn[]>;
  appendTurn(sessionKey: string, role: SessionTurn['role'], text: string): Promise<void>;
  /** Usado por el comando BORRAR. */
  clearSession(sessionKey: string): Promise<void>;
}
