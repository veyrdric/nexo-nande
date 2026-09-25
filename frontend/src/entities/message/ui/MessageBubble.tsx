import { useState } from 'react'
import type { ChatMessage } from '../model/types.ts'
import { renderMarkdownLite } from '../lib/renderMarkdownLite.tsx'

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set())

  if (message.role === 'user') {
    return (
      <div className="ml-auto max-w-[85%] rounded-3xl rounded-br-md bg-verde px-5 py-4 text-white shadow-md shadow-verde/15">
        <p className="leading-relaxed">{message.text}</p>
      </div>
    )
  }

  const toggleChecked = (index: number) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <div className="mr-auto flex max-w-[90%] items-end gap-3">
      <img
        src="/gauchito-idle.png"
        alt=""
        className="h-9 w-9 shrink-0 rounded-full bg-celeste/20 object-contain"
      />
      <div
        className={`flex flex-col gap-4 rounded-3xl rounded-bl-md px-5 py-4 shadow-sm ${
          message.isError ? 'bg-red-50 text-red-900' : 'bg-white text-gray-800'
        }`}
      >
        <div>{renderMarkdownLite(message.text)}</div>

        {message.missingInfoNote && (
          <p className="rounded-2xl bg-amarillo/15 px-4 py-3 text-sm leading-relaxed text-gray-700">
            {message.missingInfoNote}
          </p>
        )}

        {message.checklist && message.checklist.length > 0 && (
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold tracking-wide text-gray-500 uppercase">Qué llevar</p>
            <ul className="mt-3 flex flex-col gap-2.5">
              {message.checklist.map((item, i) => (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={checked.has(i)}
                      onChange={() => toggleChecked(i)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-verde"
                    />
                    <span className={checked.has(i) ? 'text-gray-400 line-through' : ''}>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {message.sources && message.sources.length > 0 && (
          <p className="text-xs text-gray-400">
            Fuente:{' '}
            {message.sources.map((source, i) => (
              <span key={source.url}>
                {i > 0 && ', '}
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-celeste"
                >
                  {source.title}
                </a>
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  )
}
