import { API_BASE_URL } from '../config/env.ts'

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
