# CLAUDE.md — backend (NestJS) · dueño: Ezequiel

Monolito modular NestJS + Drizzle + PostgreSQL/pgvector + Redis. Es el **único** componente que escribe en la base.

## Estructura
- `src/modules/<modulo>/`: cada módulo expone su API pública solo por su `index.ts`. Un módulo no importa archivos internos de otro.
- DDD (domain / application / infrastructure) **solo** en `chat-orchestration` y `knowledge-retrieval`. El resto: controller → service → repository.
- Los casos de uso dependen de **puertos** (interfaces), nunca de SDKs: `IKnowledgeSearchPort`, `IAiCompletionPort`, `ISessionMemoryPort`, `IAudioTranscriptionPort` [P1] (definidos en `docs/02-contratos.md` §2). El cálculo del embedding de la consulta vive **dentro** del adaptador de `IKnowledgeSearchPort`, no en un puerto aparte.
- Un solo adaptador de LLM, compatible con OpenAI, configurado por `LLM_*`. El proveedor se cambia desde `.env`, nunca desde el código.

## Reglas del módulo
- **Webhook de WhatsApp:** verificar `X-Hub-Signature-256` con `WHATSAPP_APP_SECRET` sobre el **cuerpo crudo** y comparación en tiempo constante. Firma inválida → 401, sin procesar. Responder 200 enseguida y procesar en segundo plano. Deduplicar por id de mensaje (Meta reintenta).
- **Salida del LLM:** siempre JSON validado contra el esquema de `contracts/`. Si no valida, se reintenta una vez; si vuelve a fallar, se responde el mensaje fijo de derivación. Nunca se envía texto sin validar.
- **Contexto recuperado:** va delimitado como datos, nunca como instrucciones. Solo chunks con `status = 'approved'`.
- **Privacidad:** teléfono → `sha256(PHONE_HASH_SALT + phone)` en el borde (controller). El resto del sistema nunca ve el número, salvo el cliente de envío de WhatsApp. Sin texto de mensajes en Postgres. Audio: en memoria, se descarta tras transcribir.
- **Validación de entrada:** DTO con `class-validator` o Zod en cada endpoint; límite `MAX_USER_MESSAGE_CHARS`.
- **SQL:** solo Drizzle o consultas parametrizadas. Nada de concatenar strings.
- **Logs:** estructurados, sin teléfono ni contenido; usar el hash truncado como correlación.

## Pruebas mínimas (Definición de Terminado)
Firma válida e inválida del webhook · validación del JSON del LLM (válido, inválido, "no sé") · búsqueda sin resultados → "no sé" · comando `BORRAR` · rate limit.

## Comandos
`npm run start:dev` · `npm run test` · `npm run db:migrate` · `npm run db:seed` (se definen en M0/M1)
