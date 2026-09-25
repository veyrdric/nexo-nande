import type { ReactNode } from 'react'

/**
 * Formateador mínimo y seguro para el markdown simple que pide el prompt del
 * backend (docs/02-contratos.md §3): negrita *así* y viñetas con "-".
 * Nunca usa dangerouslySetInnerHTML (frontend/CLAUDE.md): arma elementos de
 * React a partir del texto, no interpreta HTML.
 */
export function renderMarkdownLite(markdown: string): ReactNode {
  const lines = markdown.split('\n')
  const blocks: ReactNode[] = []
  let currentList: string[] = []

  const flushList = () => {
    if (currentList.length === 0) return
    blocks.push(
      <ul key={`list-${blocks.length}`} className="list-disc space-y-1 pl-5">
        {currentList.map((item, i) => (
          <li key={i}>{renderInlineBold(item)}</li>
        ))}
      </ul>,
    )
    currentList = []
  }

  for (const line of lines) {
    const bulletMatch = /^\s*-\s+(.+)$/.exec(line)
    if (bulletMatch) {
      currentList.push(bulletMatch[1])
      continue
    }
    flushList()
    if (line.trim().length > 0) {
      blocks.push(
        <p key={`p-${blocks.length}`} className="leading-relaxed">
          {renderInlineBold(line)}
        </p>,
      )
    }
  }
  flushList()

  return <div className="flex flex-col gap-2">{blocks}</div>
}

function renderInlineBold(text: string): ReactNode[] {
  return text.split(/(\*[^*]+\*)/g).map((part, i) => {
    if (part.length > 1 && part.startsWith('*') && part.endsWith('*')) {
      return <strong key={i}>{part.slice(1, -1)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}
