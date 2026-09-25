import { Injectable } from '@nestjs/common';
import { requireEnv } from '../../../shared/env.js';
import type { ISessionMemoryPort, SessionTurn } from '../domain/ports/ISessionMemoryPort.js';
import { redisReady } from './redis-client.js';

/** Tope de turnos guardados por sesión, más allá de cuántos se pidan en getRecentTurns. */
const MAX_STORED_TURNS = 20;

@Injectable()
export class RedisSessionMemoryAdapter implements ISessionMemoryPort {
  async getRecentTurns(sessionKey: string, maxTurns: number): Promise<SessionTurn[]> {
    const client = await redisReady;
    const raw = await client.lRange(this.key(sessionKey), -maxTurns, -1);
    return raw.map((entry) => JSON.parse(entry) as SessionTurn);
  }

  async appendTurn(sessionKey: string, role: SessionTurn['role'], text: string): Promise<void> {
    const client = await redisReady;
    const key = this.key(sessionKey);
    const turn: SessionTurn = { role, text };

    await client.rPush(key, JSON.stringify(turn));
    await client.lTrim(key, -MAX_STORED_TURNS, -1);
    // TTL de 24h se refresca en cada turno (docs/00-alcance-mvp.md P0.7).
    await client.expire(key, Number(requireEnv('SESSION_TTL_SECONDS')));
  }

  async clearSession(sessionKey: string): Promise<void> {
    const client = await redisReady;
    await client.del(this.key(sessionKey));
  }

  private key(sessionKey: string): string {
    return `session:${sessionKey}`;
  }
}
