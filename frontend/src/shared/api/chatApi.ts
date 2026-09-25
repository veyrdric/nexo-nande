import { API_BASE_URL, CHAT_API_URL } from '../config/env.ts'

// Coincide con la respuesta de POST /api/v1/chat (docs/02-contratos.md §6).
export interface ChatSource {
  title: string
  url: string
}

export interface ChatResponse {
  answerMarkdown: string
  sources: ChatSource[]
  knowsAnswer: boolean
  missingInfoNote: string | null
  checklist: string[]
}

export class ChatRateLimitError extends Error {
  constructor() {
    super('Demasiadas consultas seguidas. Esperá un minuto y volvé a intentar.')
    this.name = 'ChatRateLimitError'
  }
}

export async function sendChatMessage(sessionId: string, message: string): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message }),
  })

  if (response.status === 429) {
    throw new ChatRateLimitError()
  }
  if (!response.ok) {
    throw new Error(`El servidor respondió ${response.status}`)
  }

  return (await response.json()) as ChatResponse
}

export interface GauchitoReply {
  reply: string
  sources: ChatSource[]
}

/**
 * Backend actual del chat (temp/backend-ollama): POST /api/chat { sessionId, message } -> { reply, sources }.
 * Lanza error si la red o el servidor fallan.
 */
export async function askGauchito(sessionId: string, message: string): Promise<GauchitoReply> {
  const response = await fetch(`${CHAT_API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message }),
  })

  if (response.status === 429) {
    throw new ChatRateLimitError()
  }
  if (!response.ok) {
    throw new Error(`El servidor respondió ${response.status}`)
  }

  const data = (await response.json()) as { reply?: unknown; sources?: unknown }
  if (typeof data.reply !== 'string' || data.reply.trim() === '') {
    throw new Error('Respuesta vacía del servidor')
  }
  const sources = Array.isArray(data.sources)
    ? data.sources.filter(
        (s): s is ChatSource =>
          typeof s === 'object' && s !== null && typeof s.title === 'string' && typeof s.url === 'string',
      )
    : []
  return { reply: data.reply, sources }
}

/** "Borrar conversación": le pide al backend que olvide el historial de la sesión. No bloquea la UI. */
export function clearChatSession(sessionId: string): void {
  fetch(`${CHAT_API_URL}/api/chat/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }).catch(() => {
    // Si falla no pasa nada: el historial vence solo en el backend
  })
}
