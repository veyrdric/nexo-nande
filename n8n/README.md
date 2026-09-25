# n8n — workflows de ingesta (P2)

Workflows exportados en JSON, versionados en `workflows/`. Se levanta con el perfil `pdf` de `infra/docker-compose.yml` (`COMPOSE_PROFILES=pdf`).

Ver `n8n/CLAUDE.md` para las reglas y `docs/03-scraper-y-rag.md` para el detalle de la ingesta.

## RAG: workflow `rag-ingest`

n8n es el paso de indexación del RAG: recibe texto, lo trocea, calcula los embeddings con Ollama (`bge-m3`, local) y guarda los fragmentos en el backend del chat (`temp/backend-ollama`, almacén `data/vector-store.json`). El chat solo responde con fragmentos **aprobados** por una persona.

```
scraper (IPF + portal provincial) ──POST──► n8n /webhook/rag-ingest
    [Secreto válido?] ─► [Validar y trocear] ─► [Embeddings bge-m3] ─► [Armar lote] ─► POST backend /api/rag/ingest
chat: pregunta ─► embedding bge-m3 ─► top-k fragmentos aprobados (umbral RAG_MIN_SCORE) ─► LLM ─► respuesta + fuentes
```

| Paso | Comando |
|---|---|
| Levantar n8n con el workflow importado y publicado | `make rag-up` |
| Scrapear (deja `scraper/data/scraped/*.json`, `pending_review`) | `make scrape` (o `make scrape-dry`) |
| Indexar lo scrapeado vía n8n | `make rag-send` |
| Indexar las fichas curadas a mano (entran aprobadas) | `make rag-curated` |
| Revisar y aprobar | `make rag-review a="list pending_review"` · `a="show CODE"` · `a="approve CODE"` · `a="approve-prefix IPF-"` |

Notas:
- `infra/docker-compose.rag.yml` corre n8n con red `host`: ufw bloquea el tráfico de los contenedores al host y Ollama escucha solo en `127.0.0.1`. n8n queda escuchando solo en `127.0.0.1:5679`.
- El secreto compartido (`RAG_INGEST_SECRET`) vive en `temp/backend-ollama/.env` y `scraper/.env`; `scripts/rag-n8n-up.sh` se lo pasa a n8n. El workflow exportado no contiene secretos.
- Reindexar la misma página reemplaza sus fragmentos. Si el texto no cambió, conserva la aprobación; si cambió, vuelve a `pending_review`.
- Si no hay nada aprobado, el chat usa como respaldo la base local `temp/backend-ollama/knowledge/`.
