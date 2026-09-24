# CLAUDE.md — contracts · dueños: Ezequiel y Franco (en conjunto)

**Fuente de verdad** de toda interfaz: `openapi.yaml`, esquemas JSON (respuesta del LLM, ficha curada, lote de ingesta), `prompts.md`, `whatsapp-mensajes.md`, `n8n-webhooks.md`, tipos generados y `mocks/`.

## Regla de cambio (estricta)
1. Ningún agente modifica este directorio por su cuenta.
2. Quien necesite un cambio lo propone por escrito en `docs/sprint/handoff/` con: qué cambia, por qué y qué rompe.
3. Se aplica **solo** con aprobación explícita de las dos personas, en un commit aparte: `feat(contracts): ...` o `fix(contracts): ...`.
4. Tras el cambio: regenerar los tipos, actualizar los mocks y avisar en el registro de avance.

## Convenciones
- OpenAPI 3.1, ejemplos con datos del IPF o FICTICIOS etiquetados.
- Nombres de campos en `camelCase` inglés en la API; `snake_case` en la base.
- Todo esquema con `additionalProperties: false` y `required` explícito.
