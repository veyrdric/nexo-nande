import type { ChatSource } from '../../../shared/api/chatApi.ts'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  sources?: ChatSource[]
  checklist?: string[]
  missingInfoNote?: string | null
  isError?: boolean
}
