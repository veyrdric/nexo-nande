# CLAUDE.md — proyecto-promise

Asistente con IA que explica en pasos simples cómo acceder a la oferta del **Instituto Politécnico Formosa (IPF)**: carreras, transporte, inscripción. Canales: WhatsApp (texto; audio en P1) y chat web. Es un **servicio informativo, no oficial**. Atiende a personas vulnerables: la seguridad y la honestidad ("no sé" antes que inventar) son parte del producto.

## Leer antes de trabajar
1. `docs/00-alcance-mvp.md`: prioridades P0/P1/P2. **P0 = WhatsApp responde bien.** No trabajes en P2 si P0 no está verde.
2. `docs/04-estructura-monorepo.md`: carpetas, puertos, comandos, dueños.
3. `contracts/`: la fuente de verdad de toda interfaz.
4. El `CLAUDE.md` de la carpeta en la que vas a trabajar.

## Reglas innegociables
- **Contratos:** nunca modifiques nada en `contracts/` sin aprobación explícita de las dos personas del equipo. Si el contrato no alcanza, frená y pedilo.
- **Secretos:** nunca escribas claves, tokens ni contraseñas en el código, los tests, los docs o los commits. Solo `.env` (ignorado por Git). No leas ni imprimas `.env`; usá `.env.example` como referencia.
- **Datos personales:** no pidas ni guardes DNI ni nombre. El teléfono se guarda solo como hash con sal. El texto de los mensajes no va a Postgres (la memoria vive en Redis con TTL de 24 h). Los logs no llevan teléfono ni contenido de mensajes.
- **Anti-alucinación:** el asistente responde solo con lo recuperado de chunks `approved`; nunca inventa direcciones, horarios, requisitos ni fechas. Si falta el dato, lo dice y deriva al contacto oficial.
- **Datos de ejemplo:** siempre etiquetados como FICTICIOS. Nunca uses datos reales de personas.
- **Dudas:** preguntá antes de asumir.

## Convenciones
- Identificadores en **inglés** (tablas, columnas, variables, rutas, archivos). **Comentarios y documentación en español.**
- TypeScript estricto en todos los paquetes. Nada de `any` sin comentario que lo justifique.
- Gestor de paquetes: **npm** (workspaces). Nada de Bun ni Yarn.
- Commits: Conventional Commits con scope por carpeta: `feat(backend): ...`, `fix(frontend): ...`, `chore(infra): ...`, `docs(docs): ...`, `test(backend): ...`, `security(backend): ...`.
- Ramas: `feat/<modulo>-<descripcion>`; nunca commits directos a `main` ni a `develop`.
- Commits pequeños; cada uno compila y pasa `make test`.

## Comandos
`make help` · `make up` · `make test` · `make seed` · `make audit` · `make tunnel`

## Qué no tocar
- `docs/base/` (arquitectura de referencia, congelada).
- `DOCKER_IMAGENES/`.
- Carpetas del otro dev sin PR aprobado (ver tabla de dueños en `docs/04-estructura-monorepo.md`).
