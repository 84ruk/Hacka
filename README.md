# Auth & Users — Hackathon stack

Stack de autenticación y gestión de usuarios: **backend NestJS (Prisma, PostgreSQL, JWT)** y **frontend Next.js (App Router)**. Listo para demo de hackatón.

## Puertos

| Servicio   | Puerto |
|-----------|--------|
| Frontend  | 3000   |
| Backend   | 3001   |
| Postgres (dev)  | 5433   |
| Postgres (test) | 5434   |

## Variables de entorno

### Backend (`backend/.env`)

Copiar desde `backend/.env.example`:

- **DATABASE_URL** — Conexión PostgreSQL (obligatorio). Ejemplo Docker: `postgresql://postgres:postgres@localhost:5433/auth_db?schema=public`
- **JWT_SECRET** — Secreto para firmar JWTs (obligatorio, mínimo 32 caracteres)
- **PORT** — Puerto del backend (por defecto 3000; se recomienda **3001** para no chocar con el frontend)
- JWT_EXPIRATION, RESET_TOKEN_EXPIRATION_MINUTES, RESET_PASSWORD_BASE_URL — opcionales (ver `.env.example`)

### Frontend (`frontend/.env.local`)

Copiar desde `frontend/.env.example`:

- **NEXT_PUBLIC_API_BASE_URL** — URL del backend. Ejemplo: `http://localhost:3001`

### Tests backend (`backend/.env.test`)

Copiar desde `backend/.env.test.example`:

- **DATABASE_URL_TEST** — Obligatorio en test. Debe apuntar a una BD distinta (ej. Docker test en 5434): `postgresql://postgres:postgres@localhost:5434/auth_db_test?schema=public`
- **JWT_SECRET_TEST** — Opcional; si no está se usa JWT_SECRET o un valor por defecto en test

### E2E frontend (`frontend/.env.e2e`)

Opcional. Copiar desde `frontend/.env.e2e.example`:

- **PLAYWRIGHT_BASE_URL** — URL del frontend (por defecto `http://localhost:3000`)
- **E2E_ADMIN_EMAIL** / **E2E_ADMIN_PASSWORD** — Credenciales de un usuario con acceso admin (p. ej. superadmin: `superadmin@example.com` / `SuperAdmin123!` o admin: `admin@example.com` / `Admin123!`)

## Flujo de desarrollo

1. **Levantar Postgres (dev)**  
   En la raíz del repo:
   ```bash
   docker compose up -d
   ```
   Base de datos en `localhost:5433`.

2. **Backend: migrar y seed**
   ```bash
   cd backend
   cp .env.example .env
   # Editar .env con DATABASE_URL (puerto 5433), JWT_SECRET, PORT=3001
   npm install
   npx prisma migrate deploy
   npm run prisma:seed
   ```
   El seed crea **superadmin** (`superadmin@example.com` / `SuperAdmin123!`) y **admin** (`admin@example.com` / `Admin123!`). Ambos pueden acceder a la gestión de usuarios.

3. **Iniciar backend**
   ```bash
   npm run start:dev
   ```
   Debe quedar en http://localhost:3001.

4. **Frontend**
   ```bash
   cd frontend
   cp .env.example .env.local
   # .env.local debe tener NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
   npm install
   npm run dev
   ```
   Abrir http://localhost:3000.

5. **Documentación API (solo en desarrollo)**  
   Con el backend en marcha: http://localhost:3001/docs (Swagger).

## Flujo de tests

### Backend (unit + e2e)

1. **Levantar BD de test y migrar**
   ```bash
   cd backend
   cp .env.test.example .env.test
   # Ajustar DATABASE_URL_TEST si hace falta (puerto 5434)
   npm run test:db:up
   npm run test:db:migrate
   ```

2. **Ejecutar tests**
   ```bash
   npm run test:unit
   npm run test:e2e
   ```

3. (Opcional) Bajar BD de test: `npm run test:db:down`

### Frontend (Playwright E2E)

1. **Backend y frontend en marcha** (mismo setup que desarrollo; backend con seed para admin).

2. **Ejecutar E2E**
   ```bash
   cd frontend
   npm install
   npx playwright install chromium
   cp .env.e2e.example .env.e2e   # opcional, para E2E_ADMIN_* y PLAYWRIGHT_BASE_URL
   npm run e2e
   ```
   Opcional: `npm run e2e:ui` para interfaz de Playwright.

## Troubleshooting

- **CORS**: El backend está preparado para peticiones desde el frontend en otro puerto. Si añades otro origen, configúralo en el backend.
- **Puertos en uso**: Asegúrate de que 3000 (frontend) y 3001 (backend) estén libres. Si cambias el puerto del backend, actualiza `NEXT_PUBLIC_API_BASE_URL` en el frontend.
- **JWT_SECRET vacío**: Si el backend arranca con error de validación de config, revisa que `JWT_SECRET` en `.env` tenga al menos 32 caracteres.
- **DATABASE_URL / DATABASE_URL_TEST**: En test, `NODE_ENV=test` y el script exigen `DATABASE_URL_TEST`; no se usa la BD de desarrollo.
- **Playwright no encuentra la app**: Comprueba que frontend (y backend) estén corriendo antes de `npm run e2e` y que `PLAYWRIGHT_BASE_URL` (o el default 3000) sea correcto.

## Estructura del proyecto

- `backend/` — NestJS, Prisma, auth JWT, usuarios, Swagger en `/docs` (solo dev).
- `frontend/` — Next.js App Router, login/registro, dashboard, perfil, panel admin (usuarios).
- `docs/` — Arquitectura, fases, checklist de demo.

## Checklist de demo

Ver [docs/DEMO_CHECKLIST.md](docs/DEMO_CHECKLIST.md) para el guion de demo de 5–7 minutos.
# Hacka
# Hacka
