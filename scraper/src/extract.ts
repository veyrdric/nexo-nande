// Extracción de texto de HTML sin dependencias. El resultado es DATO NO CONFIABLE:
// puede traer instrucciones ocultas (inyección indirecta), así que solo se limpia y guarda.

const ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü', iquest: '¿', iexcl: '¡',
  ordm: 'º', ordf: 'ª', deg: '°', laquo: '«', raquo: '»', ndash: '–', mdash: '—',
  hellip: '…', ldquo: '"', rdquo: '"', lsquo: "'", rsquo: "'", bull: '•', middot: '·',
}

export const decodeEntities = (text: string) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) return String.fromCodePoint(parseInt(code.slice(2), 16))
    if (code.startsWith('#')) return String.fromCodePoint(Number(code.slice(1)))
    return ENTITIES[code] ?? match
  })

const BLOCK_TAGS = /<\/?(p|div|br|li|ul|ol|h[1-6]|tr|td|th|table|section|article|dt|dd|dl)\b[^>]*>/gi

// Líneas de ruido del portal (botones para compartir, pestañas) y nombres de funcionarios
// ("Responsable:" + nombre): no aportan y son datos de personas.
const NOISE_LINES = /^(Compartir en .*|Detalle|Formularios|Cuánto sale|Dónde se realiza|Normas|Paso a paso|Trámites similares|Trámites Externos|Descargar|Video|Tu navegador no puede reproducir este video\.)$/i

/** Recorta el HTML al área de contenido de la página (sin menús ni pie). */
export function sliceContent(html: string, start: string, end: string): string {
  if (!start) return html
  const i = html.indexOf(start)
  if (i < 0) return html
  if (!end) return html.slice(i)
  const j = html.indexOf(end, i + start.length)
  return html.slice(i, j > i ? j : undefined)
}

export function htmlToText(html: string): string {
  const withoutNoise = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|svg|noscript|nav|header|footer|form|iframe|video)\b[\s\S]*?<\/\1>/gi, ' ')
    // Restos del recorte del área de contenido (atributos de la etiqueta de apertura)
    .replace(/^[^<]*>/, ' ')

  const lines = decodeEntities(withoutNoise.replace(BLOCK_TAGS, '\n').replace(/<[^>]+>/g, ' '))
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .filter((l) => l && l !== '-->' && !NOISE_LINES.test(l))

  // Quita "Responsable:" y el nombre de la línea siguiente
  const out: string[] = []
  for (let k = 0; k < lines.length; k++) {
    if (/^Responsable:?$/i.test(lines[k] ?? '')) {
      k++
      continue
    }
    if (/^Responsable:/i.test(lines[k] ?? '')) continue
    out.push(lines[k] ?? '')
  }
  return out.join('\n').trim()
}

export function extractTitle(html: string, contentHtml: string): string {
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(contentHtml)?.[1]
  const title = h1 ?? /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? ''
  return decodeEntities(title.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .replace(/^Portal Oficial Formosa\s*\|\|\s*/i, '')
    .trim()
}

export function extractLinks(html: string): string[] {
  return [...html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)].map((m) => decodeEntities(m[1] ?? ''))
}
