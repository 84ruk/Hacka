# Fase 1 — Arquitectura del sistema de autenticación

## 1. Arquitectura general del sistema

### Visión de alto nivel

Sistema backend **modular y en capas** con NestJS como núcleo. La autenticación y la gestión de usuarios están **separadas**: el módulo `auth` orquesta login/register/tokens; el módulo `users` gestiona entidades y CRUD. La base de datos se abstrae mediante Prisma; la configuración y secretos se validan al arranque.

```
┌─────────────────────────────────────────────────────────────────┐
│                        API (REST)                                │
│  Controllers delgados → Guards → Pipes (validation) → Handlers   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Capa de servicios                            │
│  AuthService │ UsersService │ MailService │ AuditService         │
│  (lógica de negocio, sin HTTP)                                   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PrismaService (ORM)                            │
│  Repositorio único, transacciones, migraciones                   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PostgreSQL                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Principios aplicados

- **Separación de responsabilidades**: auth vs users vs infraestructura.
- **Inversión de dependencias**: servicios dependen de abstracciones (Prisma), no de detalles.
- **Single responsibility**: cada módulo tiene un propósito claro.
- **Seguridad por defecto**: hashing, tokens hasheados, mensajes neutros, validación en bordes.

---

## 2. Estructura de carpetas backend

```
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── config/                    # Configuración: @nestjs/config + validación de env
│   │   ├── env.schema.ts          # Validación (Joi o class-validator)
│   │   └── app.config.ts          # ConfigModule.forRoot() + ConfigService de Nest
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── common/                    # Carpeta compartida (sin common.module.ts salvo que exporte providers)
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── transform.interceptor.ts   # Opcional: formato estándar de respuesta
│   │   ├── dto/
│   │   │   └── pagination.dto.ts          # Si se usa paginación
│   │   └── utils/                         # Utilidades compartidas si aplica
│   │
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── jwt-refresh.strategy.ts
│   │   ├── dto/
│   │   │   ├── register.dto.ts
│   │   │   ├── login.dto.ts
│   │   │   ├── refresh-token.dto.ts
│   │   │   ├── forgot-password.dto.ts
│   │   │   └── reset-password.dto.ts
│   │   └── interfaces/
│   │       └── token-payload.interface.ts
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   ├── update-user.dto.ts
│   │   │   └── user-query.dto.ts
│   │   └── entities/              # Opcional: representación de salida (o usar Prisma types)
│   │       └── user-response.entity.ts
│   │
│   ├── mail/                      # Envío de emails (forgot/reset)
│   │   ├── mail.module.ts
│   │   ├── mail.service.ts
│   │   └── templates/             # Plantillas o mock
│   │
│   ├── audit/                     # Trazabilidad interna; sin controller al inicio
│   │   ├── audit.module.ts
│   │   └── audit.service.ts
│   │
│   └── health/                    # Opcional; útil para demo y despliegue
│       ├── health.module.ts
│       └── health.controller.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── test/
│   ├── unit/
│   │   ├── auth.service.spec.ts
│   │   └── users.service.spec.ts
│   ├── e2e/                       # Supertest contra app real; no mezclar "integration" y "e2e"
│   │   ├── auth.e2e-spec.ts
│   │   └── users.e2e-spec.ts
│   └── jest-e2e.json
│
├── .env.example
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. Responsabilidad de cada módulo

| Módulo   | Responsabilidad |
|----------|------------------|
| **config** | Usar `@nestjs/config`: `ConfigModule.forRoot(...)` en `app.config.ts`, validación con `env.schema.ts`. **No** módulo/servicio de config propio; usar `ConfigService` de Nest. |
| **prisma** | Conexión a PostgreSQL, `PrismaService` inyectable, cierre graceful. Sin lógica de negocio. |
| **common** | Carpeta compartida (sin `common.module.ts`): guards (JWT, Roles), decorators (`@CurrentUser()`, `@Roles()`), filters, interceptors, DTOs base, utils. Se importan donde se usan. |
| **auth** | Registro, login, logout, refresh token, `/auth/me`, forgot password, reset password. Emisión de JWT, hashing con Argon2, almacenamiento de refresh token hasheado. **No** contiene CRUD de usuarios. |
| **users** | CRUD de usuarios, obtener por ID, actualizar, cambiar estado (activar/desactivar). Sanitización de respuestas (nunca devolver `passwordHash`, `refreshTokenHash`, etc.). Consumido por auth para "crear usuario" en registro. |
| **mail** | Envío de emails (forgot/reset). En MVP puede ser mock que loguee o devuelva el link; preparado para SMTP/ SendGrid luego. |
| **audit** | (Opcional en MVP.) Registro de acciones sensibles (login, cambio de rol, etc.) para trazabilidad interna. Solo módulo + service; **sin controller** al inicio; añadir controller después solo si se necesita exponer logs por API. |
| **health** | Endpoint `/health` (y opcionalmente `/health/db`) para readiness/liveness. Útil en hackatón y en despliegue. |

---

## 4. Convenciones técnicas del proyecto

### Código y estilo

- **TypeScript estricto**: `strict: true` en `tsconfig.json`.
- **Naming**:
  - Archivos: `kebab-case` (e.g. `auth.service.ts`, `current-user.decorator.ts`).
  - Clases: `PascalCase`. Servicios: `*Service`, Controllers: `*Controller`, DTOs: `*Dto`.
  - Constantes: `UPPER_SNAKE_CASE` (e.g. en env).
- **Imports**: ordenados (externos → internos → relativos); path aliases `@/` si se configuran.

### Capas

- **Controllers**: solo reciben request, validan (DTO + pipe), llaman a **un** método de service y devuelven la respuesta. Sin lógica de negocio.
- **Services**: toda la lógica de negocio, llamadas a Prisma, hashing, generación de tokens. Lanzan excepciones tipadas (NestJS `HttpException` o custom).
- **DTOs**: un DTO por caso de uso (RegisterDto, LoginDto, UpdateUserDto, etc.). Validación con `class-validator` y `class-transformer`. No exponer campos internos.

### Seguridad

- Contraseñas: solo **Argon2** (nunca bcrypt para nuevo código).
- Refresh token: guardar **hash** en BD, nunca el token en claro.
- Reset token: igual, hash + expiración.
- Mensajes de error en login/registro: **neutros** (“Credenciales inválidas” sin revelar si el email existe).
- Respuestas: nunca devolver `passwordHash`, `refreshTokenHash`, `resetTokenHash`; excluir en serialización o DTOs de respuesta.
- JWT: access token corto (ej. 15 min), refresh largo (ej. 7 días). Validar `exp` y `iat`.

### Excepciones

- Usar `HttpException` (o excepciones que se traduzcan a HTTP) con códigos correctos: 400, 401, 403, 404, 409.
- Filter global opcional para formatear errores (mensaje, code, timestamp) y no filtrar stack en producción.

### Base de datos

- Prisma: un `schema.prisma` claro; migraciones versionadas; sin lógica en SQL crudo salvo que sea necesario.
- Transacciones: usar cuando un flujo altere más de una tabla (e.g. crear usuario + enviar mail).
- **Usuarios: sin delete físico.** Gestión por estado: `UserStatus` (ACTIVE, INACTIVE, SUSPENDED). Desactivar usuario = cambiar status; opcionalmente añadir `deletedAt` más adelante para soft delete explícito. Definido desde Fase 1 para evitar ambigüedad en Fase 4.

### Gestión de usuarios y borrado (definido en Fase 1)

- **No hay delete físico** de usuarios en el sistema.
- Se maneja todo con **estado** (`UserStatus`): `ACTIVE`, `INACTIVE`, `SUSPENDED`.
- Desactivar usuario = actualizar `status` a `INACTIVE` (o `SUSPENDED` según reglas de negocio).
- Opcional en el futuro: campo `deletedAt` para soft delete explícito y filtros por “no eliminados”.
- Esta decisión evita ambigüedad en Fase 4 (módulo Users) y en el diseño del schema en Fase 2.

### Tests

- **Unit**: `test/unit/*.spec.ts` — servicios con Prisma mockeado (jest.mock o inyección de mock).
- **E2E**: `test/e2e/*.e2e-spec.ts` — Supertest contra app real, BD de test. No mezclar nombres "integration" y "e2e"; convención única: unit vs e2e.
- Limpiar datos entre tests e2e si hace falta. No buscar 100% cobertura; priorizar auth, users y guards.

### Git y entorno

- `.env` nunca en repo; `.env.example` con variables necesarias sin valores sensibles.
- Validación de env al arranque: si falta variable obligatoria, fallar con mensaje claro.

---

## 5. Orden exacto de implementación recomendado

Implementar en este orden para minimizar dependencias y poder probar cada bloque.

| # | Fase / bloque | Contenido |
|---|----------------|-----------|
| 1 | **Fase 1** | Arquitectura, carpetas, convenciones (este documento). |
| 2 | **Fase 2** | Schema Prisma (User, enums Role/UserStatus), índices, migración inicial, seed de admin. |
| 3 | **Fase 3** | Proyecto NestJS, `ConfigModule.forRoot()` + `app.config.ts` + validación env, PrismaModule + PrismaService, AppModule base. |
| 4 | **Fase 4** | Módulo Users: DTOs, UsersService (CRUD, sanitización, **sin delete físico**; desactivar vía status), UsersController, exclusión de campos sensibles. |
| 5 | **Fase 5** | Módulo Auth: register, login, JWT (access + refresh), logout, /auth/me, Argon2, lastLoginAt. |
| 6 | **Fase 6** | Roles: RolesGuard, @Roles(), JwtAuthGuard, restricción de endpoints admin. |
| 7 | **Fase 7** | Forgot password / Reset password: tokens hasheados, expiración, mail (mock si hace falta). |
| 8 | **Fase 8** | Tests: `test/unit/*.spec.ts` (AuthService, UsersService), `test/e2e/*.e2e-spec.ts` (auth, users, autorización por roles). |
| 9 | **Fase 9** | Frontend base (Next.js): login, register, dashboard, perfil, admin users. |
| 10 | **Fase 10** | E2E Playwright, Swagger, README, checklist demo. |

Dependencias críticas entre fases:

- Fase 4 (Users) antes de Fase 5 (Auth) porque el registro crea usuarios.
- Fase 5 antes de Fase 6 (Guards usan JWT y usuario).
- Fase 6 antes de tests de autorización en Fase 8.

---

## Resumen Fase 1

- **Arquitectura**: backend modular en capas (API → Services → Prisma → PostgreSQL), con auth y users separados.
- **Config**: `@nestjs/config` con `env.schema.ts` + `app.config.ts`; sin `config.module`/`config.service` propios.
- **Common**: carpeta compartida sin `common.module.ts`; decorators, guards, filters, interceptors, dto, utils.
- **Audit**: solo module + service; sin controller al inicio.
- **Tests**: `test/unit/*.spec.ts` y `test/e2e/*.e2e-spec.ts` (convención única; no mezclar integration/e2e).
- **Usuarios**: sin delete físico; gestión por status (ACTIVE, INACTIVE, SUSPENDED); opcional `deletedAt` después.
- **Orden**: 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10.

Cuando confirmes que esta Fase 1 está cerrada, se puede continuar con la **Fase 2 — Base de datos y Prisma** (schema, enums, User, índices, migración, seed).
