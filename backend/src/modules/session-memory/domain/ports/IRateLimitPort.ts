// docs/00-alcance-mvp.md P0.8: RATE_LIMIT_WA_PER_PHONE_PER_MIN / RATE_LIMIT_WEB_PER_IP_PER_MIN.
export const RATE_LIMIT_PORT = Symbol('IRateLimitPort');

export interface IRateLimitPort {
  /** true si está permitido (no superó el límite en la ventana actual). Incrementa el contador. */
  isAllowed(key: string, limitPerMinute: number): Promise<boolean>;
}
