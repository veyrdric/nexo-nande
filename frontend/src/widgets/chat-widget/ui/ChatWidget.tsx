import { SendHorizontal, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { MessageBubble, type ChatMessage } from '../../../entities/message'
import { ChatRateLimitError, sendChatMessage } from '../../../shared/api/chatApi.ts'
import { getOrCreateSessionId, resetSessionId } from '../../../shared/lib/session.ts'

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: '¡Mba\'éichapa! Soy el Gauchito. Preguntame lo que quieras saber sobre las carreras, la inscripción o el transporte del Politécnico de Formosa (IPF).',
}

export function ChatWidget() {
  const [sessionId, setSessionId] = useState(() => getOrCreateSessionId())
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || isSending) return

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text }
    setMessages((prev) => [...prev, userMessage])
    setDraft('')
    setIsSending(true)

    try {
      const response = await sendChatMessage(sessionId, text)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: response.answerMarkdown,
          sources: response.sources,
          checklist: response.checklist,
          missingInfoNote: response.missingInfoNote,
        },
      ])
    } catch (error) {
      const text =
        error instanceof ChatRateLimitError
          ? error.message
          : 'No pude conectarme en este momento. Probá de nuevo en un rato.'
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', text, isError: true }])
    } finally {
      setIsSending(false)
    }
  }

  const handleClear = () => {
    setSessionId(resetSessionId())
    setMessages([WELCOME_MESSAGE])
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-4 bg-celeste px-6 py-5 sm:px-8">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-white/70 bg-white/90">
            <img src="/gauchito-idle.png" alt="" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Nexo Ñandé</h1>
            <p className="text-sm text-white/90">Asistente del Politécnico de Formosa</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Borrar conversación</span>
        </button>
      </header>

      <p className="border-b border-slate-200 bg-slate-100 px-6 py-2.5 text-center text-xs font-medium text-gray-500 sm:px-8">
        Servicio informativo, no oficial. Verificá siempre con el IPF.
      </p>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto bg-slate-50 px-6 py-8 sm:px-8">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isSending && (
          <div className="mr-auto flex items-end gap-3">
            <img src="/gauchito-loading.png" alt="" className="h-9 w-9 shrink-0 rounded-full bg-celeste/20 object-contain" />
            <div className="flex items-center gap-3 rounded-3xl rounded-bl-md bg-white px-5 py-4 shadow-sm">
              <span className="flex gap-1">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    style={{ animationDelay: `${delay}ms` }}
                    className="h-2 w-2 animate-bounce rounded-full bg-celeste"
                  />
                ))}
              </span>
              <span className="text-sm text-gray-400">El Gauchito está escribiendo...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-center gap-3 border-t border-slate-100 bg-white px-4 py-4 sm:px-6"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Escribile al Gauchito…"
          aria-label="Mensaje"
          maxLength={1000}
          className="h-13 flex-1 rounded-full border border-slate-200/70 bg-slate-50 px-5 text-base text-gray-800 placeholder:text-gray-400 focus:border-celeste focus:bg-white focus:ring-4 focus:ring-celeste/20 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim() || isSending}
          aria-label="Enviar mensaje"
          className="h-13 w-13 flex shrink-0 items-center justify-center rounded-full bg-verde text-white shadow-lg shadow-verde/25 hover:scale-105 hover:bg-verde-dark active:scale-95 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
        >
          <SendHorizontal className="h-5 w-5" />
        </button>
      </form>
    </div>
  )
}
