import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

// Descarga respetuosa: User-Agent identificable, una petición a la vez con pausa,
// caché local, reintentos con espera exponencial (máx. 3) y robots.txt.

const USER_AGENT = process.env.SCRAPER_USER_AGENT || 'proyecto-promise-scraper/0.1 (hackathon; uso educativo)'
const DELAY_MS = Number(process.env.SCRAPER_DELAY_MS) || 2000
const CACHE_DIR = path.resolve(import.meta.dirname, '../data/cache')
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const MAX_RETRIES = 3

export interface FetchedPage {
  url: string
  finalUrl: string
  html: string
  fromCache: boolean
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let lastRequestAt = 0
const politeWait = async () => {
  const wait = lastRequestAt + DELAY_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequestAt = Date.now()
}

/** Decodifica según el charset que declare el servidor (el portal provincial usa ISO-8859-1). */
const decode = (buffer: ArrayBuffer, contentType: string): string => {
  const charset = /charset=([\w-]+)/i.exec(contentType)?.[1]?.toLowerCase() ?? 'utf-8'
  try {
    return new TextDecoder(charset).decode(buffer)
  } catch {
    return new TextDecoder('utf-8').decode(buffer)
  }
}

const cachePath = (url: string) =>
  path.join(CACHE_DIR, `${crypto.createHash('sha1').update(url).digest('hex')}.json`)

const readCache = (url: string): FetchedPage | null => {
  try {
    const file = cachePath(url)
    if (Date.now() - fs.statSync(file).mtimeMs > CACHE_TTL_MS) return null
    return { ...(JSON.parse(fs.readFileSync(file, 'utf8')) as FetchedPage), fromCache: true }
  } catch {
    return null
  }
}

const writeCache = (page: FetchedPage) => {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(cachePath(page.url), JSON.stringify(page))
}

/** Descarga una página. Devuelve null si no existe (404 o redirección a la página de error del portal). */
export async function fetchPage(url: string): Promise<FetchedPage | null> {
  const cached = readCache(url)
  if (cached) return cached

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    await politeWait()
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
        signal: AbortSignal.timeout(30_000),
      })
      // El portal provincial redirige las páginas que ya no existen a /error
      if (res.status === 404 || /\/error(\?|$)/.test(new URL(res.url).pathname + new URL(res.url).search)) {
        return null
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = decode(await res.arrayBuffer(), res.headers.get('content-type') ?? '')
      const page: FetchedPage = { url, finalUrl: res.url, html, fromCache: false }
      writeCache(page)
      return page
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err
      await sleep(1000 * 2 ** attempt)
    }
  }
  return null
}

/** Reglas Disallow de robots.txt para "User-agent: *". Si no hay robots.txt, no hay restricciones. */
export async function loadRobots(origin: string): Promise<string[]> {
  await politeWait()
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('text/plain')) return []
    const disallow: string[] = []
    let applies = false
    for (const raw of (await res.text()).split('\n')) {
      const line = raw.replace(/#.*/, '').trim()
      const [key, ...rest] = line.split(':')
      const value = rest.join(':').trim()
      if (/^user-agent$/i.test(key ?? '')) applies = value === '*'
      else if (applies && /^disallow$/i.test(key ?? '') && value) disallow.push(value)
    }
    return disallow
  } catch {
    return []
  }
}

export const isAllowedByRobots = (pathname: string, disallow: string[]) =>
  !disallow.some((rule) => pathname.startsWith(rule))
