# CLAUDE.md

Este archivo proporciona instrucciones a Claude Code cuando trabaje con código en este repositorio.

## Propósito del repositorio

Este repositorio corresponde a un MVP full-stack para hackatón.

La aplicación consiste en:
- backend REST API con NestJS,
- frontend con Next.js,
- autenticación con JWT,
- control de acceso basado en roles,
- y gestión administrativa de usuarios.

La meta principal no es construir un sistema perfecto ni completamente escalable desde el primer día, sino entregar un prototipo funcional, claro, estable y demostrable dentro del tiempo limitado del hackatón.

---

## Objetivo del agente en este repositorio

Claude debe ayudar a desarrollar el proyecto de la forma más eficiente posible dentro del contexto de hackatón.

Debe priorizar siempre:
1. funcionalidad demostrable,
2. estabilidad mínima razonable,
3. rapidez de implementación,
4. claridad del flujo para demo,
5. limpieza suficiente del código,
6. escalabilidad futura solo cuando no retrase lo esencial.

Claude no debe caer en sobreingeniería ni hacer refactors grandes innecesarios si eso pone en riesgo el avance del MVP.

---

## Prioridades del hackatón

Cuando haya conflicto entre varias decisiones técnicas, seguir este orden:

1. Que la funcionalidad principal funcione
2. Que pueda mostrarse en demo
3. Que no rompa flujos ya existentes
4. Que sea rápida de implementar y probar
5. Que el código sea suficientemente claro
6. Que quede preparado para mejoras futuras

Si una mejora no ayuda al demo, no desbloquea una funcionalidad importante y no reduce un riesgo real, debe posponerse.

---

## Reglas generales de trabajo

- Antes de crear código nuevo, revisar si ya existe algo reutilizable.
- No duplicar lógica si ya hay un helper, servicio, componente, hook o utilidad similar.
- Mantener cambios pequeños, claros y fáciles de probar.
- Priorizar soluciones simples y robustas sobre soluciones complejas.
- No hacer refactors amplios si no son necesarios para completar la tarea actual.
- No romper funcionalidades existentes por perseguir mejoras menores.
- No cambiar nombres, rutas, contratos o estructuras si no hay una razón real.
- Si hay poco tiempo, construir primero una versión funcional aunque sea básica.
- Si detectas deuda técnica, distinguir entre:
  - urgente para el hackatón,
  - mejora posterior al hackatón.

---

## Qué debe hacer Claude antes de programar

Antes de modificar código, Claude debe:

1. Entender el objetivo exacto de la tarea.
2. Revisar la estructura existente.
3. Identificar archivos, componentes, servicios y utilidades relacionadas.
4. Revisar si ya existe lógica reutilizable.
5. Proponer un plan breve si la tarea afecta varias partes del sistema.

Si la tarea es pequeña, puede actuar directamente sin hacer un plan extenso.

---

## Qué debe evitar Claude

- No reinventar estructuras ya existentes.
- No agregar dependencias innecesarias.
- No complicar la arquitectura por buenas prácticas excesivas.
- No hacer optimizaciones prematuras.
- No asumir comportamiento del backend o frontend sin revisar el código.
- No borrar código importante sin explicar el motivo.
- No introducir abstracciones complejas si una implementación simple resuelve el problema.
- No bloquear el avance del hackatón por perfeccionismo.

---

## Formato esperado al terminar una tarea

Cuando Claude termine una tarea, debe responder de forma estructurada con:

1. Qué hizo
2. Qué archivos modificó
3. Cómo probarlo
4. Qué riesgos, limitaciones o pendientes detectó
5. Qué recomienda hacer después

---

## Criterio de “hecho”

Una tarea se considera terminada cuando:

- cumple el objetivo solicitado,
- el flujo principal funciona,
- no rompe lo existente,
- el código nuevo es entendible,
- los archivos modificados son coherentes entre sí,
- y puede probarse manualmente.

Si existen lint, tests o build y el tiempo lo permite, deben ejecutarse.
En hackatón, la prioridad es no frenar el avance por perfeccionismo.

---

## Regla de integración frontend-backend

Cuando una tarea involucre frontend y backend, Claude debe:

- verificar el contrato real de datos,
- confirmar nombres de campos, tipos y estructura,
- no asumir endpoints inexistentes,
- señalar claramente si falta algo del backend para completar el frontend,
- adaptar el frontend al contrato real o explicar qué debe cambiarse.

---

## Reglas específicas para frontend

Si la tarea involucra frontend, Claude debe:

- priorizar una experiencia clara para demo,
- mantener componentes reutilizables cuando sea razonable,
- evitar duplicar fetchers, hooks o lógica de estado,
- manejar estados de loading, error y empty state cuando aporten valor,
- construir una UI suficientemente limpia para presentación.

Si el tiempo es limitado:
- preferir UI simple y funcional,
- evitar animaciones o detalles que no aporten al objetivo principal.

---

## Reglas específicas para backend

Si la tarea involucra backend, Claude debe:

- reutilizar servicios, módulos y utilidades existentes,
- mantener separación básica de responsabilidades,
- validar entradas importantes,
- devolver respuestas consistentes,
- manejar errores de forma clara,
- evitar complejidad innecesaria.

Si el tiempo es limitado:
- priorizar endpoints funcionales y razonablemente seguros,
- no complicar la arquitectura más de lo necesario.

---

## Seguridad mínima esperada

Aunque sea hackatón, Claude debe cuidar al menos lo siguiente:

- no exponer secretos,
- no hardcodear credenciales reales fuera de credenciales de desarrollo o seed explícitamente definidas,
- validar entradas importantes,
- evitar confiar ciegamente en datos del cliente,
- no dejar rutas críticas sin protección si ya existe auth o control de roles.

Si una solución completa de seguridad no cabe en tiempo, aplicar al menos una versión mínima razonable.

---

## Si la tarea involucra IA, simulaciones, hardware o sensores

Si una funcionalidad depende de hardware, sensores, IA o integraciones externas todavía no completamente listas, Claude puede usar:
- datos simulados,
- mocks,
- flujos demo,
- respuestas stub temporales.

Esto es válido siempre que:
- el flujo sea demostrable,
- quede claro qué es prototipo,
- no se oculte que algunas partes siguen simuladas.

La prioridad es demostrar el valor del sistema en el hackatón.

---

## Resumen técnico del proyecto

### Descripción general
MVP full-stack de hackatón: backend REST API en NestJS + frontend Next.js con autenticación JWT, control de acceso por roles y administración de usuarios.

---

## Configuración de desarrollo

### Prerrequisitos
- Node.js 18 o superior
- Docker

### Levantar servicios
```bash
# Levantar PostgreSQL de desarrollo (puerto 5433)
docker compose up -d

# Backend (corre en :3001)
cd backend && cp .env.example .env
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev

# Frontend (corre en :3000)
cd frontend && cp .env.example .env.local
npm install
npm run dev
```

### Puertos

| Servicio           | Puerto |
|--------------------|--------|
| Frontend           | 3000   |
| Backend API        | 3001   |
| Swagger docs       | 3001/docs |
| PostgreSQL dev     | 5433   |
| PostgreSQL test    | 5434   |

### Credenciales seed (demo)

- `superadmin@example.com` / `SuperAdmin123!`
- `admin@example.com` / `Admin123!`

---

## Comandos

### Backend (`cd backend`)

```bash
npm run start:dev       # Modo watch
npm run build           # Compilar a dist/
npm run test:unit       # Tests unitarios Jest
npm run test:e2e        # Tests E2E (requiere BD de test)
npm run test:db:up      # Levantar PostgreSQL de test
npm run test:db:migrate # Migrar BD de test
npm run test:db:down    # Bajar PostgreSQL de test
npx prisma studio       # GUI de base de datos
```

### Frontend (`cd frontend`)

```bash
npm run dev             # Servidor de desarrollo
npm run build           # Build de producción
npm run lint            # ESLint
npm run e2e             # Tests Playwright
npm run e2e:ui          # Playwright en modo interactivo
```

---

## Arquitectura

### Backend — NestJS modular (capas)

```
Controllers → Guards → Pipes (validación DTOs) → Services → PrismaService → PostgreSQL
```

**Módulos:**
- `ConfigModule` — variables de entorno validadas con Joi (`src/config/env.schema.ts`)
- `PrismaModule` — proveedor global, único punto de acceso a BD
- `AuthModule` — estrategias JWT, login/register, refresh de token, reset de contraseña
- `UsersModule` — CRUD con queries por rol
- `MailModule` — scaffold de email para reset de contraseña
- `CommonModule` — guards, decoradores, middleware CSRF

**Decisiones clave:**
- Refresh tokens se **hashean** antes de guardar (evita robo completo del token)
- Borrado de usuarios es **soft delete** vía campo `status` (`ACTIVE`, `INACTIVE`, `SUSPENDED`)
- Roles: `SUPERADMIN` > `ADMIN` > `USER`
- `ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true`
- CORS habilitado para `localhost:3000`, `localhost:3001`, `127.0.0.1`

### Frontend — Next.js App Router

**Grupos de rutas:**
- `app/(public)/` — páginas de auth (login, register, forgot/reset password)
- `app/(protected)/` — páginas autenticadas (dashboard, perfil, admin de usuarios)

**Patrones clave:**
- `AuthContext` (`src/context/AuthContext.tsx`) — estado global de auth con React Context
- `src/lib/api.ts` — cliente HTTP con refresh automático de token en 401
- `src/lib/auth.ts` — funciones helper de autenticación
- `src/components/ui/` — componentes reutilizables (Button, Card, Modal, Alert, Badge, Spinner, Input)

### Esquema de base de datos (Prisma)

Modelo `User`: `id`, `email`, `passwordHash`, `firstName`, `lastName`, `role` (enum), `status` (enum), `refreshTokenHash`, timestamps. Índices en `email` y `status`.

---

## Variables de entorno

### Backend `.env`

```
DATABASE_URL                    # Conexión PostgreSQL
JWT_SECRET                      # Mínimo 32 caracteres
JWT_ACCESS_EXPIRATION           # Default 15m
JWT_REFRESH_EXPIRATION          # Default 7d
PORT                            # Recomendado 3001
NODE_ENV                        # development | production | test
RESET_TOKEN_EXPIRATION_MINUTES  # Default 60
RESET_PASSWORD_BASE_URL         # Default http://localhost:3000
```

### Frontend `.env.local`

```
NEXT_PUBLIC_API_BASE_URL        # URL del backend (ej: http://localhost:3001)
```

### Frontend `.env.e2e` (Playwright)

```
PLAYWRIGHT_BASE_URL             # Default http://localhost:3000
E2E_ADMIN_EMAIL
E2E_ADMIN_PASSWORD
```