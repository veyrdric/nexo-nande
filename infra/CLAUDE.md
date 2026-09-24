# CLAUDE.md — infra · dueño: Ezequiel

`docker-compose.yml` de desarrollo e inicialización de Postgres.

## Reglas
- Los puertos se publican **solo** en `127.0.0.1`. Nunca `0.0.0.0` ni puertos sin prefijo.
- Imágenes con versión fija cuando se conozca (hay `PENDIENTE` marcados en el compose). Preferir las disponibles offline (`DOCKER_IMAGENES/`).
- Los secretos llegan por variables desde `.env`; nunca valores literales en el compose.
- Redis sin persistencia a disco (la memoria de conversación es efímera por diseño).
- El usuario de la app en Postgres (`APP_DB_USER`) no crea ni borra tablas; las migraciones usan el admin.
- El túnel expone solo el backend y solo durante el desarrollo y el demo.
- Cualquier cambio acá se prueba con `make down && make up` antes del commit.
