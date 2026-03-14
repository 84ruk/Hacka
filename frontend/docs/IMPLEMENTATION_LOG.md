# Registro de implementación — Frontend (Next.js)

Documento acumulado por fase. Fase 9 en detalle a continuación.

---

## Fase 9 — Frontend base (Next.js)

**Objetivo:** Frontend mínimo profesional (hackathon-ready) con Next.js App Router: registro, login, sesión segura, rutas protegidas (/dashboard, /profile, /users admin), integración con backend existente, manejo 401/403/409 y UX limpia.

### Configuración reactiva por ENV

- **NEXT_PUBLIC_API_BASE_URL** (obligatoria en runtime): toda la comunicación con el backend usa esta URL; no hay URLs hardcodeadas en código ni en scripts de `package.json`.
- **Convención de puertos (reproducible):** Frontend Next en **3000** (por defecto). Backend en **3001** (definir `PORT=3001` en `backend/.env`). Así no hay conflicto al correr ambos en local.
- **`frontend/.env.example`**: plantilla con `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`. Copiar a `.env.local`.

### Decisión de sesión (MVP)

**Opción B (implementada):** accessToken y refreshToken en **localStorage**; hook `useAuth()` que carga `/auth/me` al montar y que, ante 401 en cualquier llamada, puede usar refresh (ya aplicado en useAuth al cargar usuario). Logout llama a `POST /auth/logout` y limpia localStorage.

- **Tradeoffs:** localStorage es accesible desde JS (riesgo XSS); no es httpOnly. Aceptable para hackatón; para producción se recomienda migrar a refresh token en cookie httpOnly y accessToken en memoria o cookie de corta duración.
- **Migración futura:** Backend podría aceptar refresh en cookie; frontend enviaría cookie en `/auth/refresh` y no guardaría refresh en localStorage; accessToken solo en memoria o cookie httpOnly de corta duración.

### Integración con backend (contratos)

- **Auth:** POST /auth/register, POST /auth/login, POST /auth/refresh, POST /auth/logout, GET /auth/me.
- **Users (ADMIN + JWT):** GET /users, POST /users, PATCH /users/:id, PATCH /users/:id/status.
- **Manejo de errores:** 401 → redirigir a /login (ProtectedRoute); 403 → mensaje "No tienes permisos" (y en /users página 403 UX con link a dashboard); 409 → "Email ya existe" en formularios. No se muestran nunca campos sensibles (el backend ya sanitiza).

### Rutas

| Ruta        | Acceso   | Descripción                                      |
|------------|----------|--------------------------------------------------|
| /          | Público  | Inicio con enlaces a login, register, dashboard |
| /login     | Público  | Formulario login                                 |
| /register  | Público  | Formulario registro                              |
| /dashboard | Protegido| Área protegida; redirige a /login si no hay sesión |
| /profile   | Protegido| Datos de GET /auth/me                            |
| /users     | Admin    | Lista usuarios, crear, cambiar status; 403 UX si no ADMIN |

### Archivos creados (Fase 9)

| Archivo | Descripción |
|---------|-------------|
| `frontend/package.json` | Next 14, React 18, react-hook-form, zod, @hookform/resolvers, Tailwind. Scripts dev/build/start sin URLs hardcodeadas. |
| `frontend/next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs` | Configuración Next, TypeScript y Tailwind. |
| `frontend/.env.example` | NEXT_PUBLIC_API_BASE_URL. |
| `frontend/src/lib/env.ts` | Lee y valida NEXT_PUBLIC_API_BASE_URL; getApiBaseUrl() lanza si falta en cliente. |
| `frontend/src/lib/api.ts` | Wrapper fetch con base URL desde env, Authorization, manejo 401/403/409. |
| `frontend/src/lib/auth.ts` | login, register, logout, refreshTokens, fetchMe, getStoredAccessToken, setSession, clearSession (localStorage). |
| `frontend/src/hooks/useAuth.ts` | Estado user/loading/error; carga /auth/me al montar; refresh en 401; logout, getAccessToken, refetch. |
| `frontend/src/components/Navbar.tsx` | Enlaces Inicio, Login, Register (si no logueado); Dashboard, Perfil, Usuarios (si ADMIN); email y Cerrar sesión. |
| `frontend/src/components/ProtectedRoute.tsx` | Guard CSR: sin sesión → redirect /login; requireAdmin y no ADMIN → 403 UX + link a dashboard. |
| `frontend/src/components/forms/LoginForm.tsx` | React Hook Form + Zod; email/password; 401 → "Credenciales incorrectas". |
| `frontend/src/components/forms/RegisterForm.tsx` | React Hook Form + Zod; email, password, firstName, lastName opcionales; 409 → "Este email ya está registrado". |
| `frontend/src/components/users/UsersTable.tsx` | Tabla usuarios; select de status (ACTIVE/INACTIVE/SUSPENDED); callback onStatusChange. |
| `frontend/src/app/layout.tsx` | Layout raíz con Navbar y contenedor. |
| `frontend/src/app/globals.css` | Estilos Tailwind. |
| `frontend/src/app/page.tsx` | Página de inicio con enlaces. |
| `frontend/src/app/(public)/login/page.tsx` | Página login con LoginForm; éxito → redirect /dashboard. |
| `frontend/src/app/(public)/register/page.tsx` | Página registro con RegisterForm; éxito → redirect /dashboard. |
| `frontend/src/app/(protected)/layout.tsx` | Envuelve con ProtectedRoute (sin requireAdmin). |
| `frontend/src/app/(protected)/dashboard/page.tsx` | Mensaje de bienvenida y enlaces a perfil y usuarios (si ADMIN). |
| `frontend/src/app/(protected)/profile/page.tsx` | Muestra datos de user (GET /auth/me). |
| `frontend/src/app/(protected)/users/page.tsx` | ProtectedRoute requireAdmin; lista usuarios, formulario crear, UsersTable con cambio de status. |

### Cómo correr el frontend

**Convención:** frontend en puerto **3000**, backend en **3001**.

1. **Backend** (en otra terminal): `cd backend`, asegurar `PORT=3001` en `.env`, luego `npm run start:dev`. Debe quedar en http://localhost:3001.
2. **Frontend:**

```bash
cd frontend
cp .env.example .env.local
# .env.local ya trae NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
npm install
npm run dev
```

3. Abrir http://localhost:3000 (Next por defecto).

### Cómo probar los flujos

1. **Registro y login:** Ir a /register, rellenar email y contraseña (mín. 8 caracteres), enviar. Debe redirigir a /dashboard. Cerrar sesión desde la navbar. Ir a /login, mismo email/contraseña → de nuevo /dashboard.
2. **Sin sesión:** Sin estar logueado, abrir /dashboard o /profile → redirección a /login.
3. **Perfil:** Logueado, ir a /profile → se muestran email, nombre, rol, estado (datos de /auth/me).
4. **Usuario normal en /users:** Logueado como USER, ir a /users → mensaje "Sin permisos" y botón "Ir al Dashboard".
5. **Admin en /users:** Logueado como ADMIN (crear usuario admin por backend o seed), ir a /users → tabla de usuarios, formulario crear usuario, cambio de status en select. Crear usuario con email nuevo → debe aparecer en la tabla. Cambiar status → debe persistir.
6. **Errores:** Login con contraseña incorrecta → "Credenciales incorrectas". Registro con email ya existente → "Este email ya está registrado".

### Tabla de verificación (Fase 9)

| Criterio | Confirmado |
|----------|------------|
| Puedo registrar y hacer login | Sí |
| Puedo ver /profile y /dashboard solo autenticado | Sí |
| Sin autenticación → redirige a /login | Sí |
| Usuario USER en /users → 403 UX + link dashboard | Sí |
| Usuario ADMIN en /users → lista, crear, cambiar status | Sí |
| Logout limpia sesión | Sí |
| Todo usa NEXT_PUBLIC_API_BASE_URL (nada hardcodeado) | Sí |

### Verificación adicional

- **¿Qué pasa si expira el accessToken al hacer GET /users?**  
  Hoy: la API devuelve 401; la página de usuarios muestra el mensaje de error devuelto por el backend y no refresca ni redirige a /login. El refresh de tokens solo se usa en `useAuth` al hidratar el usuario (fetchMe). Para mejorar en una siguiente iteración se podría: ante 401 en cualquier llamada, intentar refresh una vez, reenviar la petición y, si el refresh falla, redirigir a /login.

- **Logout:**  
  Sí. En `frontend/src/lib/auth.ts`, `logout()` primero obtiene el refreshToken de localStorage, llama a `POST /auth/logout` con body `{ refreshToken }` (y hace `.catch(() => {})` para no fallar si el backend no responde), y después ejecuta `clearSession()`, que elimina accessToken, refreshToken y user de localStorage. Orden: invalida sesión en backend y luego limpia almacenamiento local.

**Estado:** PENDIENTE

---

## Fase 10 — Cierre y demo

**Objetivo:** Cerrar el proyecto para demo de hackatón con E2E Playwright (frontend), Swagger (backend), README reproducible y checklist de demo (5–7 min).

### 1) Playwright E2E (frontend)

- **Configuración:** `playwright.config.ts` con `baseURL` desde `PLAYWRIGHT_BASE_URL` (default `http://localhost:3000`). Carga opcional de `.env.e2e` para `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `PLAYWRIGHT_BASE_URL`.
- **Estrategia de datos E2E:** Se usa el admin del seed del backend (`admin@example.com` / `Admin123!`). No se crea admin por API; el backend debe estar corriendo con BD migrada y seed aplicado.
- **Flujos cubiertos:**
  1. Register → dashboard.
  2. Logout → redirect a login.
  3. Login USER → ir a /users → 403 UX (“Sin permisos”, “Ir al Dashboard”).
  4. Login ADMIN → /users → lista visible, cambio de estado de un usuario (select).
  5. /profile muestra datos del usuario (email, rol).
- **Archivos:** `frontend/playwright.config.ts`, `frontend/tests/e2e/auth.spec.ts`, `frontend/tests/e2e/users-and-profile.spec.ts`, `frontend/.env.e2e.example`. Scripts `e2e` y `e2e:ui` en `frontend/package.json`. `.env.e2e` en `.gitignore`.

### 2) Swagger (backend)

- **Integración:** `@nestjs/swagger` en `main.ts`. Documentación disponible en **/docs** solo cuando `NODE_ENV !== 'production'`.
- **Configuración:** `DocumentBuilder` (título, descripción, versión, `addBearerAuth()`), `SwaggerModule.setup('docs', app, document)`.
- **Documentación:** Endpoints de auth y users con `@ApiTags`, `@ApiOperation`, `@ApiBody`, `@ApiResponse`, `@ApiBearerAuth`, `@ApiParam`, `@ApiQuery`. DTOs de request con `@ApiProperty`/`@ApiPropertyOptional`. Esquemas de respuesta: `AuthResponseDto`, `AuthTokensDto`, `UserResponseDto` (clases solo para Swagger).
- **Archivos:** `backend/src/main.ts`, `backend/src/auth/auth.controller.ts`, `backend/src/users/users.controller.ts`, DTOs en `auth/dto` y `users/dto`, nuevos `auth-response.dto.ts`, `auth-tokens.dto.ts`, `user-response.dto.ts`.

### 3) README reproducible

- **Ubicación:** `README.md` en la raíz del proyecto.
- **Contenido:** Puertos (frontend 3000, backend 3001, Postgres dev 5433, test 5434). Variables de entorno para backend, frontend, tests backend y E2E frontend. Flujo dev (Postgres, migrar, seed, backend, frontend). Flujo tests (BD test up/migrate, unit + e2e backend; Playwright con frontend y backend en marcha). Sección “Troubleshooting” (CORS, puertos, JWT_SECRET, DATABASE_URL_TEST, Playwright).

### 4) Checklist demo

- **Ubicación:** `docs/DEMO_CHECKLIST.md`.
- **Guion (5–7 min):** (1) Registro y login, (2) Dashboard y perfil, (3) Usuario USER en /users → 403 UX, (4) Admin en /users y cambio de status, (5) Mostrar /docs Swagger, (6) Comandos de tests (unit, e2e backend, Playwright).

### Archivos creados o modificados (Fase 10)

| Archivo | Descripción |
|---------|-------------|
| `frontend/playwright.config.ts` | Config E2E; baseURL desde env; carga .env.e2e. |
| `frontend/tests/e2e/auth.spec.ts` | Tests: register → dashboard, logout → login. |
| `frontend/tests/e2e/users-and-profile.spec.ts` | Tests: USER → 403 en /users, ADMIN → lista y cambio status, /profile datos. |
| `frontend/.env.e2e.example` | PLAYWRIGHT_BASE_URL, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD. |
| `frontend/package.json` | Scripts `e2e`, `e2e:ui`; devDeps `@playwright/test`, `dotenv`. |
| `frontend/.gitignore` | Añadido `.env.e2e`. |
| `backend/src/main.ts` | Setup Swagger en /docs solo si NODE_ENV !== 'production'. |
| `backend/package.json` | Dependencia `@nestjs/swagger`. |
| `backend/src/auth/auth.controller.ts` | ApiTags, ApiOperation, ApiBody, ApiResponse, tipos DTO respuesta. |
| `backend/src/users/users.controller.ts` | ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, UserResponseDto. |
| `backend/src/auth/dto/*.ts` | ApiProperty en Register, Login, Refresh, Forgot, Reset; AuthResponseDto, AuthTokensDto. |
| `backend/src/users/dto/*.ts` | ApiProperty en Create, Update, UpdateStatus, UserQuery; UserResponseDto. |
| `README.md` (root) | Setup, puertos, env, flujo dev, flujo tests, troubleshooting. |
| `docs/DEMO_CHECKLIST.md` | Guion de demo 5–7 min. |

### Cómo correr Playwright

1. Backend en 3001 y frontend en 3000 (con seed aplicado para admin).
2. `cd frontend`, `npm install`, `npx playwright install chromium`.
3. Opcional: `cp .env.e2e.example .env.e2e` y ajustar variables.
4. `npm run e2e`. Opcional: `npm run e2e:ui` para interfaz de Playwright.

### Cómo ver Swagger

1. Backend en modo desarrollo (`npm run start:dev`) en el puerto configurado (ej. 3001).
2. Abrir en el navegador: `http://localhost:3001/docs`. Solo disponible si `NODE_ENV !== 'production'`.

### Checklist demo

Ver `docs/DEMO_CHECKLIST.md`: registro/login, dashboard/perfil, 403 en /users para USER, admin en /users y cambio de status, /docs Swagger, comandos de tests.

**Estado:** PENDIENTE (hasta aprobación).

---

## Qué sigue

- Fin del proyecto. Fase 10 cierra E2E Playwright, Swagger, README y checklist de demo.
