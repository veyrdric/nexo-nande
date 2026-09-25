# proyecto-promise — comandos del monorepo
# Requiere: docker (con compose v2), node, npm, make. En Windows: ejecutar dentro de WSL2.

SHELL := /bin/bash
COMPOSE := docker compose --env-file .env -f infra/docker-compose.yml
GITLEAKS_IMAGE := zricethezav/gitleaks:latest  # PENDIENTE: fijar versión
PACKAGES := backend frontend scraper

.DEFAULT_GOAL := help
.PHONY: help env-check up down restart logs ps migrate seed review scrape scrape-dry test eval audit tunnel clean-db rag-up rag-send rag-curated rag-review

help: ## Lista los comandos disponibles
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

env-check: ## Verifica que .env exista y no tenga valores CAMBIAR
	@test -f .env || { echo "Falta .env: cp .env.example .env y completalo"; exit 1; }
	@if grep -nE '=CAMBIAR' .env; then echo "Hay variables sin completar (arriba)"; exit 1; fi
	@echo "OK: .env completo"

up: env-check ## Levanta db, redis y los perfiles de COMPOSE_PROFILES
	$(COMPOSE) up -d
	$(COMPOSE) ps

down: ## Detiene los contenedores (los datos persisten)
	$(COMPOSE) down

restart: down up ## Reinicia el entorno

logs: ## Sigue los logs (make logs s=backend para uno solo)
	$(COMPOSE) logs -f $(s)

ps: ## Estado de los contenedores
	$(COMPOSE) ps

migrate: ## Aplica migraciones (M1)
	@test -f backend/package.json || { echo "Pendiente: M1 crea backend/"; exit 1; }
	cd backend && npm run db:migrate

seed: migrate ## Carga los datos curados del IPF como aprobados (M1)
	cd backend && npm run db:seed

review: ## Revisión de lo que entró por n8n/scraper (make review a="list" | a="approve CODE")
	cd backend && npm run db:review -- $(or $(a),list)

scrape: ## Ejecuta el scraper del IPF y deja JSON en scraper/data/ (M2)
	@test -f scraper/package.json || { echo "Pendiente: M2 crea scraper/"; exit 1; }
	cd scraper && npm run scrape

scrape-dry: ## Scraper sin escribir ni enviar nada (M2)
	@test -f scraper/package.json || { echo "Pendiente: M2 crea scraper/"; exit 1; }
	cd scraper && npm run scrape -- --dry-run

rag-up: ## Levanta n8n con el workflow del RAG (rag-ingest) importado y publicado
	bash scripts/rag-n8n-up.sh

rag-send: ## Manda lo scrapeado (scraper/data/scraped) a n8n para indexarlo (entra pending_review)
	cd scraper && npm run send

rag-curated: ## Manda las fichas curadas a mano a n8n (entran aprobadas)
	cd scraper && npm run send:curated

rag-review: ## Revisión humana del RAG (make rag-review a="list pending_review" | a="approve CODE" | a="approve-prefix IPF-")
	cd backend && npm run -s review -- $(or $(a),list)

test: ## Corre las pruebas de cada paquete existente
	@set -e; for p in $(PACKAGES); do \
	  if [ -f $$p/package.json ]; then echo "== $$p"; (cd $$p && npm run test); else echo "== $$p (pendiente)"; fi; \
	done

eval: ## Batería de evaluación del RAG: % aciertos y % "no sé" correcto (M10)
	@test -f scripts/eval/run.ts || { echo "Pendiente: M10 crea scripts/eval/"; exit 1; }
	npx tsx scripts/eval/run.ts

audit: ## Escaneo de secretos (gitleaks) y de dependencias
	docker run --rm -v "$(CURDIR):/repo" $(GITLEAKS_IMAGE) detect --source /repo --no-banner --redact
	@for p in $(PACKAGES); do \
	  if [ -f $$p/package.json ]; then echo "== npm audit $$p"; (cd $$p && npm audit) || exit 1; fi; \
	done

tunnel: ## Expone el backend para el webhook de Meta (solo desarrollo)
	@source .env && if [ "$$TUNNEL_TOOL" = "cloudflared" ]; then \
	  cloudflared tunnel --url http://127.0.0.1:$$BACKEND_PORT; \
	else \
	  ngrok http 127.0.0.1:$$BACKEND_PORT; \
	fi

clean-db: ## BORRA la base local y la recrea vacía (pide confirmación)
	@read -p "Esto borra todos los datos locales. Escribí 'si' para continuar: " ok && [ "$$ok" = "si" ]
	$(COMPOSE) down -v
