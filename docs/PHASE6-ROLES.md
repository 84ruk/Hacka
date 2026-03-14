# Fase 6 — Roles y autorización

## Entregables

- **Decorador** `@Roles(...roles)`: `backend/src/common/decorators/roles.decorator.ts`
- **Guard** `RolesGuard`: `backend/src/common/guards/roles.guard.ts`
- **Protección** del módulo users: solo usuarios con rol `ADMIN` pueden acceder a `GET/POST/PATCH /users` y `PATCH /users/:id/status`.

## Comportamiento

1. **JwtAuthGuard**: valida el access token y deja en `request.user` el usuario (UserResponse con `role`).
2. **RolesGuard**: lee los roles permitidos vía `@Roles()` (Reflector) y comprueba que `request.user.role` esté en esa lista. Si no hay `@Roles()` en el handler/clase, no restringe por rol.
3. **UsersController**: a nivel de clase se aplican `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles(Role.ADMIN)`, así que todas las rutas de users exigen usuario autenticado y rol ADMIN.

## Endpoints

| Ruta | Auth | Rol |
|------|------|-----|
| POST /auth/register | No | — |
| POST /auth/login | No | — |
| POST /auth/refresh | No | — |
| POST /auth/logout | No | — |
| GET /auth/me | JWT | Cualquier autenticado |
| POST /users | JWT | ADMIN |
| GET /users | JWT | ADMIN |
| GET /users/:id | JWT | ADMIN |
| PATCH /users/:id | JWT | ADMIN |
| PATCH /users/:id/status | JWT | ADMIN |

## Cómo probar

- Sin token o token inválido en `GET /users` → 401.
- Token de usuario con rol USER en `GET /users` → 403 (Insufficient permissions).
- Token de usuario con rol ADMIN en `GET /users` → 200 y lista de usuarios.

## Qué sigue

**Fase 7** — Forgot password / Reset password: tokens hasheados, expiración, mail (mock si hace falta).
