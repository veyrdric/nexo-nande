# CLAUDE.md — n8n · dueño: Franco · prioridad P2 (solo carga de PDF)

n8n **solo hace ingesta**: recibe el PDF o el texto del panel, extrae, limpia, trocea y envía el lote al backend (`POST /api/v1/internal/ingestion/batch`, firmado con `INGEST_HMAC_SECRET`). **Nunca escribe directo en Postgres** ni atiende consultas de ciudadanos.

## Reglas
- Cada workflow se exporta a `workflows/<nombre>.json` después de cada cambio y se commitea. Revisar el JSON antes del commit: **no debe contener credenciales**.
- Credenciales solo en el gestor de credenciales de n8n.
- No guardar datos de ejecuciones exitosas (ver variables `EXECUTIONS_DATA_*` en `infra/docker-compose.yml`).
- Webhooks de n8n: solo accesibles desde la red de Docker o `127.0.0.1`, con secreto compartido.
- Todo lo que entra queda `pending_review` hasta que el editor lo apruebe en el panel.
- El detalle de nodos, chunking y pruebas va en `docs/03-scraper-y-rag.md` (Bloque 3).
