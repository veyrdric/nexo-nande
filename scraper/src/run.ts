import fs from 'node:fs'
import path from 'node:path'
import { extractLinks, extractTitle, htmlToText, sliceContent } from './extract.ts'
import { fetchPage, isAllowedByRobots, loadRobots } from './fetch-page.ts'

// Uso:
//   node src/run.ts scrape [--dry-run] [--only=ipf|gob] [--max=N]   -> data/scraped/*.json (pending_review)
//   node src/run.ts send [--dry-run]                                 -> manda data/scraped a n8n (rag-ingest)
//   node src/run.ts curated [--dry-run]                              -> manda las fichas curadas a mano (approved)

interface Site {
  id: string
  origin: string
  codePrefix: string
  contentStart: string
  contentEnd: string
  seeds: string[]
  store: string[]
  follow: string[]
}

interface ScrapedDocument {
  code: string
  title: string
  sourceUrl: string
  capturedAt: string
  isFictional: boolean
  status: 'pending_review' | 'approved'
  text: string
}

const ROOT = path.resolve(import.meta.dirname, '..')
const SCRAPED_DIR = path.join(ROOT, 'data/scraped')
const MIN_TEXT_CHARS = 200

const args = process.argv.slice(2)
const command = args[0]
const flag = (name: string) => args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`))
const flagValue = (name: string) => flag(name)?.split('=')[1]
const dryRun = Boolean(flag('dry-run'))

const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'sources.json'), 'utf8')) as {
  maxPagesPerSite: number
  sites: Site[]
}

const today = () => new Date().toISOString().slice(0, 10)

/** Código estable por URL: GOB-TRAMITE-17, IPF-CARRERAS-MECATRONICA, IPF-HOME. */
const toCode = (site: Site, pathname: string) => {
  const tramite = /^\/tramite\/(\d+)\//.exec(pathname)
  if (tramite) return `${site.codePrefix}-TRAMITE-${tramite[1]}`
  const slug = pathname
    .replace(/^\/|\/$/g, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${site.codePrefix}-${slug || 'HOME'}`.slice(0, 80)
}

/** Clave para no visitar dos veces la misma página (el portal repite enlaces con otra capitalización). */
const visitKey = (pathname: string) => {
  const byId = /^\/(tramite|tramites\/tema|tramites\/destinatario)\/(\d+)/.exec(pathname)
  return byId ? `${byId[1]}/${byId[2]}` : pathname.toLowerCase().replace(/\/$/, '') || '/'
}

async function scrapeSite(site: Site, max: number): Promise<ScrapedDocument[]> {
  const storeRules = site.store.map((r) => new RegExp(r))
  const followRules = site.follow.map((r) => new RegExp(r))
  const disallow = await loadRobots(site.origin)
  console.log(`\n[${site.id}] robots.txt: ${disallow.length ? disallow.join(', ') : 'sin restricciones'}`)

  const queue = [...site.seeds]
  const seen = new Set<string>()
  const documents: ScrapedDocument[] = []
  let visited = 0

  while (queue.length && visited < max) {
    const pathname = queue.shift() ?? ''
    const key = visitKey(pathname)
    if (seen.has(key)) continue
    seen.add(key)
    if (!isAllowedByRobots(pathname, disallow)) {
      console.log(`  robots.txt prohíbe ${pathname}`)
      continue
    }

    const safeDecode = (s: string) => {
      try { return decodeURI(s) } catch { return s }
    }
    const url = site.origin + encodeURI(safeDecode(pathname))
    visited++
    let page
    try {
      page = await fetchPage(url)
    } catch (err) {
      console.log(`  ERROR ${pathname}: ${(err as Error).message}`)
      continue
    }
    if (!page) {
      console.log(`  no existe ${pathname}`)
      continue
    }

    // Enlaces a seguir: solo del mismo dominio (lista blanca) y que cumplan las reglas
    for (const href of extractLinks(page.html)) {
      let link: URL
      try {
        link = new URL(href, site.origin)
      } catch {
        continue
      }
      if (link.origin !== site.origin) continue
      const linkPath = safeDecode(link.pathname)
      if (followRules.some((r) => r.test(linkPath)) && !seen.has(visitKey(linkPath))) queue.push(linkPath)
    }

    if (!storeRules.some((r) => r.test(pathname))) continue
    const content = sliceContent(page.html, site.contentStart, site.contentEnd)
    const text = htmlToText(content)
    const title = extractTitle(page.html, content) || pathname
    if (text.length < MIN_TEXT_CHARS) {
      console.log(`  poco texto (${text.length}) ${pathname}`)
      continue
    }
    const doc: ScrapedDocument = {
      code: toCode(site, pathname),
      title,
      sourceUrl: url,
      capturedAt: today(),
      isFictional: false,
      status: 'pending_review', // lo scrapeado nunca entra aprobado: lo decide una persona
      text,
    }
    documents.push(doc)
    console.log(`  ok ${doc.code} (${text.length} caracteres)${page.fromCache ? ' [caché]' : ''}`)
  }
  console.log(`[${site.id}] ${visited} páginas visitadas, ${documents.length} documentos`)
  return documents
}

async function scrape() {
  const only = flagValue('only')
  const max = Number(flagValue('max')) || config.maxPagesPerSite
  const sites = config.sites.filter((s) => !only || s.id === only)
  const all: ScrapedDocument[] = []
  for (const site of sites) all.push(...(await scrapeSite(site, max)))

  if (dryRun) {
    console.log(`\n--dry-run: se habrían guardado ${all.length} documentos en data/scraped/`)
    return
  }
  fs.mkdirSync(SCRAPED_DIR, { recursive: true })
  for (const doc of all) fs.writeFileSync(path.join(SCRAPED_DIR, `${doc.code}.json`), JSON.stringify(doc, null, 2))
  console.log(`\nGuardados ${all.length} documentos en data/scraped/. Siguiente paso: npm run send`)
}

/** Manda documentos al webhook de n8n en lotes chicos (cada lote se vectoriza en n8n). */
async function sendToN8n(documents: ScrapedDocument[]) {
  const url = process.env.N8N_RAG_INGEST_URL || 'http://127.0.0.1:5679/webhook/rag-ingest'
  const secret = process.env.RAG_INGEST_SECRET
  if (!secret) throw new Error('Falta RAG_INGEST_SECRET (ver scraper/.env.example)')
  if (dryRun) {
    console.log(`--dry-run: se mandarían ${documents.length} documentos a ${url}`)
    return
  }
  const BATCH = 8
  let ok = 0
  for (let i = 0; i < documents.length; i += BATCH) {
    const batch = documents.slice(i, i + BATCH)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-ingest-secret': secret },
      body: JSON.stringify({ documents: batch }),
      signal: AbortSignal.timeout(10 * 60_000),
    })
    const body = await res.text()
    if (!res.ok) {
      console.log(`  lote ${i / BATCH + 1}: ERROR ${res.status} ${body.slice(0, 200)}`)
      continue
    }
    ok += batch.length
    console.log(`  lote ${i / BATCH + 1}: ${batch.map((d) => d.code).join(', ')}`)
  }
  console.log(`Enviados ${ok}/${documents.length} documentos a n8n`)
}

const readJsonDir = <T,>(dir: string): T[] =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as T)
    : []

/** Fichas curadas a mano (revisadas por una persona): entran aprobadas. */
function loadCurated(): ScrapedDocument[] {
  const docs: ScrapedDocument[] = []
  // Fichas JSON del contrato (scraper/data/curado)
  for (const f of readJsonDir<Record<string, unknown>>(path.join(ROOT, 'data/curado'))) {
    if (f.status !== 'approved') continue
    const requirements = Array.isArray(f.requirements) && f.requirements.length ? `Requisitos: ${f.requirements.join('; ')}` : ''
    docs.push({
      code: String(f.code),
      title: String(f.title),
      sourceUrl: String(f.source_url ?? ''),
      capturedAt: String(f.captured_at ?? today()),
      isFictional: f.is_fictional === true,
      status: 'approved',
      text: [f.title, f.summary, requirements, f.office ? `Dónde: ${String(f.office)}` : '', 'Institución: Instituto Politécnico Formosa (IPF)']
        .filter(Boolean)
        .join('\n\n'),
    })
  }
  // Markdown de la base local del backend (datos de demo marcados FICTICIO)
  const mdDir = path.resolve(ROOT, '../temp/backend-ollama/knowledge')
  if (fs.existsSync(mdDir)) {
    for (const f of fs.readdirSync(mdDir).filter((n) => n.endsWith('.md'))) {
      const text = fs.readFileSync(path.join(mdDir, f), 'utf8')
      docs.push({
        code: `DEMO-${f.replace(/\.md$/, '').toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`,
        title: /^#\s+(.+)$/m.exec(text)?.[1] ?? f.replace(/\.md$/, '').replace(/-/g, ' '),
        sourceUrl: 'N/A (datos de demostración)',
        capturedAt: today(),
        isFictional: /FICTICIO/i.test(text),
        status: 'approved',
        text,
      })
    }
  }
  return docs
}

async function main() {
  if (command === 'scrape') return scrape()
  if (command === 'send') return sendToN8n(readJsonDir<ScrapedDocument>(SCRAPED_DIR))
  if (command === 'curated') return sendToN8n(loadCurated())
  console.log('Comandos: scrape [--dry-run] [--only=ipf|gob] [--max=N] | send [--dry-run] | curated [--dry-run]')
  process.exitCode = 1
}

main().catch((err: unknown) => {
  console.error((err as Error).message)
  process.exitCode = 1
})
