# Documentación del proyecto

Índice de la documentación técnica y de fases.

## Documentos principales

| Documento | Contenido |
|-----------|-----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitectura general, estructura de carpetas, responsabilidades de módulos, convenciones y orden de implementación (Fase 1). |
| [PHASE2-DATABASE.md](PHASE2-DATABASE.md) | Base de datos y Prisma: schema, enums, modelo User, índices, decisión status vs deletedAt, migración, seed y campos sensibles. |
| [PHASE3-INFRASTRUCTURE.md](PHASE3-INFRASTRUCTURE.md) | Infraestructura backend: NestJS, ConfigModule, validación de env, PrismaModule y AppModule (Fase 3). |

## Resumen por fase

- **Fase 1** — Arquitectura y convenciones. Definición de módulos (config, prisma, common, auth, users, mail, audit, health), tests (unit / e2e), gestión de usuarios por status sin delete físico.
- **Fase 2** — Schema Prisma con User, Role, UserStatus; migración `init`; seed de admin; sin deletedAt en MVP.
- **Fase 3** — Proyecto NestJS con ConfigModule (Joi), PrismaModule global y bootstrap en main.
- **Fase 4** — Módulo Users (pendiente).
- **Fases 5–10** — Auth, roles, forgot/reset password, tests, frontend, E2E (pendientes).

Ver tabla completa en [ARCHITECTURE.md](ARCHITECTURE.md#5-orden-exacto-de-implementación-recomendado).

## Referencia rápida

- **README del repo**: [../README.md](../README.md) — inicio rápido, scripts, variables de entorno.
- **README del backend**: [../backend/README.md](../backend/README.md) — instalación, scripts y estructura del backend.
