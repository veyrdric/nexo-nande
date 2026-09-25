const SESSION_STORAGE_KEY = 'nexo-nande.chat-session-id'

/**
 * Sesión anónima: solo un UUID sin datos personales (frontend/CLAUDE.md).
 * Si localStorage no está disponible (modo privado, etc.), sigue funcionando
 * pero no persiste entre recargas.
 */
export function getOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_STORAGE_KEY)
    if (existing) return existing
    const fresh = crypto.randomUUID()
    localStorage.setItem(SESSION_STORAGE_KEY, fresh)
    return fresh
  } catch {
    return crypto.randomUUID()
  }
}

/** Usado por "Borrar conversación": la sesión vieja queda huérfana en Redis hasta que expira su TTL. */
export function resetSessionId(): string {
  const fresh = crypto.randomUUID()
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, fresh)
  } catch {
    // No hay localStorage disponible: no es crítico, la próxima carga genera una sesión nueva igual.
  }
  return fresh
}
