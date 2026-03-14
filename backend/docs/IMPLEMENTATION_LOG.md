# Registro de implementación — Backend Auth & Users

Documento acumulado por fase. Fase 8 en detalle a continuación.

---

## Fase 8 — Tests unit y e2e

**Objetivo:** Pruebas automatizadas (unit + e2e con Supertest) que validen auth, users+roles, forgot/reset password y sanitización. Con esta fase se considera verificada la Fase 7 si las pruebas pasan.

### 1. Configuración reactiva por ENV (única fuente de verdad)

- **Una sola regla**, en `src/config/env-resolver.ts`: si `NODE_ENV=test`, la app usa variables `*_TEST` como fuente preferente.
- **Fail-fast:** en `NODE_ENV=test`, **DATABASE_URL_TEST es obligatoria**. Si falta, `applyTestEnvOverrides()` lanza y los tests no arrancan, para no usar la BD de dev por accidente.
- **JWT_SECRET_TEST:** prioridad `*_TEST`, fallback a `JWT_SECRET`; si ambos faltan en test el resolver asigna un valor por defecto para e2e (documentado en env-resolver y en .env.test.example).
- No hay duplicación: `app.config.ts` no tiene lógica de test; usa `value.DATABASE_URL` y `value.JWT_SECRET` (ya fijados por el resolver en setup). El setup solo llama a `applyTestEnvOverrides()`; no muta ENV por su cuenta.

### 2. Aislamiento de BD de test

- **`backend/.env.test.example`** creado y documentado: copiar a `.env.test`, definir al menos `DATABASE_URL_TEST` (obligatoria en test). Incluye URL por defecto para la BD de test en Docker (puerto 5434).
- **Script `test:e2e`** carga `.env.test` automáticamente con `dotenv-cli` y fija `NODE_ENV=test` con `cross-env`. Así no se usa la BD de dev en e2e.

### 3. DB de test en Docker (obligatorio)

- **`backend/docker-compose.test.yml`**: levanta Postgres para tests en puerto **5434** (distinto a dev 5433), base `auth_db_test`, volumen `pgdata_test`. Contenedor `hacka-db-test`.
- **Variables en `.env.test.example`**: `DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5434/auth_db_test?schema=public` para ese contenedor.
- **Scripts en `package.json`**:
  - **`test:db:up`**: `docker compose -f docker-compose.test.yml up -d` — levanta la BD de test.
  - **`test:db:down`**: `docker compose -f docker-compose.test.yml down` — baja la BD de test.
  - **`test:db:migrate`**: aplica migraciones a la BD de test (carga `.env.test`, aplica env-resolver, ejecuta `prisma migrate deploy`). Estrategia: **deploy** en test (no se crean migraciones nuevas; reproducible y consistente con CI).
  - **`test:e2e`**: asume que la BD de test está arriba y que ya se ejecutó `test:db:migrate`; carga `.env.test` y corre los e2e.

- **`backend/scripts/migrate-test-db.js`**: carga `.env.test`, aplica `applyTestEnvOverrides()` y ejecuta `npx prisma migrate deploy` con `DATABASE_URL` apuntando a la BD de test.

### 4. Flujo reproducible (e2e con BD test)

1. **Levantar BD test:** `npm run test:db:up`
2. **Aplicar migraciones a BD test:** `npm run test:db:migrate`
3. **Correr tests e2e:** `npm run test:e2e`
4. **Bajar BD test (opcional):** `npm run test:db:down`

### 5. Setup e2e mínimo

- `test/e2e/setup.ts`: solo bootstrap; llama a `applyTestEnvOverrides()`. No carga archivos ni muta ENV; la carga de `.env.test` la hace el script de npm.

### Archivos implicados (Fase 8)

| Archivo | Cambio |
|--------|--------|
| `backend/docker-compose.test.yml` | Postgres test en 5434, BD auth_db_test, volumen pgdata_test. |
| `backend/scripts/migrate-test-db.js` | Carga .env.test, aplica env-resolver, ejecuta prisma migrate deploy. |
| `backend/.env.test.example` | DATABASE_URL_TEST para Docker test (5434); pasos 1–4 documentados. |
| `backend/package.json` | test:db:up, test:db:down, test:db:migrate, test:e2e (sin cambio de lógica). |
| `backend/src/config/env-resolver.ts` | Regla única; fail-fast si falta DATABASE_URL_TEST. |
| `backend/test/e2e/setup.ts` | Solo invoca applyTestEnvOverrides(). |
| `backend/src/config/env.schema.ts` | DATABASE_URL_TEST y JWT_SECRET_TEST opcionales. |
| `backend/src/config/app.config.ts` | Sin lógica duplicada de test. |

### Cómo correr los tests

```bash
cd backend
cp .env.test.example .env.test   # opcional: ya trae URL para Docker test (5434)
npm install

# Unit (no usa BD)
npm run test:unit
npm run test

# E2E con BD de test en Docker (reproducible)
npm run test:db:up               # levanta Postgres test en 5434
npm run test:db:migrate          # aplica migraciones a la BD test
npm run test:e2e                 # e2e contra .env.test (DATABASE_URL_TEST obligatoria)
npm run test:db:down             # opcional: bajar BD test
```

### Tabla de verificación (evidencia de ejecución)

| Comando | Resultado esperado | Confirmado |
|---------|--------------------|------------|
| `npm run test:unit` | PASS (todos los unit pasan) | Sí/No |
| `npm run test:e2e`  | PASS (todos los e2e pasan; usa .env.test, no BD dev) | Sí/No |
| `npm run test:db:up` | OK (contenedor hacka-db-test arriba en 5434) | Sí/No |

**Estado:** PENDIENTE

---

## Fase 10 — Swagger (documentación API)

**Objetivo:** Documentar la API en `/docs` para demo y consumo externo (solo en desarrollo).

- **Integración:** `@nestjs/swagger` en `main.ts`. Swagger se monta en **/docs** solo cuando `NODE_ENV !== 'production'`.
- **Documentación:** Controladores auth y users con `@ApiTags`, `@ApiOperation`, `@ApiBody`, `@ApiResponse`, `@ApiBearerAuth`; DTOs de request con `@ApiProperty`; esquemas de respuesta `AuthResponseDto`, `AuthTokensDto`, `UserResponseDto`.
- **Archivos:** `main.ts`, `auth.controller.ts`, `users.controller.ts`, DTOs en auth y users, nuevos `auth-response.dto.ts`, `auth-tokens.dto.ts`, `user-response.dto.ts`.
- **Ver:** Con el backend en marcha (dev), abrir `http://localhost:3001/docs`.
