#!/usr/bin/env bash
# Levanta n8n con el override del RAG, importa el workflow rag-ingest y lo publica.
# Uso: bash scripts/rag-n8n-up.sh
set -euo pipefail
cd "$(dirname "$0")/.."

BACKEND_ENV=temp/backend-ollama/.env
# Solo se extrae el secreto compartido; no se imprime.
RAG_INGEST_SECRET="$(grep -E '^RAG_INGEST_SECRET=' "$BACKEND_ENV" | cut -d= -f2-)"
export RAG_INGEST_SECRET
[ -n "$RAG_INGEST_SECRET" ] || { echo "Falta RAG_INGEST_SECRET en $BACKEND_ENV" >&2; exit 1; }

COMPOSE="docker compose --env-file .env -f infra/docker-compose.yml -f infra/docker-compose.rag.yml --profile pdf"

$COMPOSE up -d n8n
echo "Esperando a n8n..."
for _ in $(seq 1 60); do
  curl -sf http://127.0.0.1:${N8N_HOST_PORT:-5679}/healthz >/dev/null && break
  sleep 2
done

$COMPOSE exec -T n8n n8n import:workflow --input=/workflows/rag-ingest.json
$COMPOSE exec -T n8n n8n publish:workflow --id=ragIngest0000001
# Los cambios hechos por CLI se toman al reiniciar
$COMPOSE restart n8n
for _ in $(seq 1 60); do
  curl -sf http://127.0.0.1:${N8N_HOST_PORT:-5679}/healthz >/dev/null && break
  sleep 2
done
echo "n8n listo: webhook en http://127.0.0.1:${N8N_HOST_PORT:-5679}/webhook/rag-ingest"
