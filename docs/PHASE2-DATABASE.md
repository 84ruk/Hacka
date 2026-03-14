# Fase 2 — Base de datos y Prisma

## Entregables

| Entregable | Archivo / valor |
|------------|------------------|
| Schema inicial | `backend/prisma/schema.prisma` |
| Enums | `Role`, `UserStatus` |
| Modelo | `User` (todos los campos para auth y users) |
| Índices | `email` (unique), `tenantId`, `status` |
| Seed admin | `backend/prisma/seed.ts` |
| Nombre migración inicial | **`init`** (recomendado) |

---

## 1. Decisión: no `deletedAt`; solo `status`

| Criterio | Decisión en Fase 2 |
|----------|--------------------|
| **Delete físico** | No existe. No se elimina ningún usuario de la tabla. |
| **Gestión de “baja”** | Solo por **estado**: `UserStatus` = `ACTIVE` \| `INACTIVE` \| `SUSPENDED`. |
| **Desactivar usuario** | Actualizar `status` a `INACTIVE` (o `SUSPENDED`). |
| **`deletedAt`** | No en el MVP. Opcional más adelante si se quiere soft-delete explícito y filtros “no eliminados” unificados. |

Consecuencias en código:

- En Fase 4 (Users): no hay endpoint “delete”; sí “cambiar estado” / “desactivar”.
- Queries por defecto pueden filtrar por `status = ACTIVE` cuando el negocio lo requiera; el schema ya tiene índice en `status`.

---

## 2. Schema resumido

- **Enums**: `Role` (ADMIN, USER), `UserStatus` (ACTIVE, INACTIVE, SUSPENDED).
- **Modelo `User`**: id (cuid), email (unique), passwordHash, firstName, lastName, role, status, tenantId (opcional), lastLoginAt, emailVerifiedAt, refreshTokenHash, resetTokenHash, resetTokenExpiresAt, createdAt, updatedAt.
- **Índices**: `@unique` en `email`; índices en `tenantId` y `status`. En el MVP no se usa índice compuesto `(tenantId, email)` porque el email es globalmente único.

---

## 3. Migración inicial (recomendación)

1. **PostgreSQL** levantado y accesible.
2. En `backend/` crear `.env` con `DATABASE_URL` (ejemplo en `.env.example`).
3. Instalar dependencias y generar cliente:

   ```bash
   cd backend
   npm install
   npx prisma generate
   ```

4. Crear y aplicar la primera migración:

   ```bash
   npx prisma migrate dev --name init
   ```

   Esto crea la carpeta `backend/prisma/migrations` y la migración `init` con la tabla `users` y enums.

5. (Opcional) Ejecutar el seed del admin:

   ```bash
   npx prisma db seed
   ```

   Credenciales por defecto del admin (solo desarrollo/demo): ver `backend/prisma/seed.ts` (ej. `admin@example.com` / `Admin123!`). En producción, cambiar la contraseña tras el primer login.

**Nombre de la migración inicial**: se recomienda **`init`** (`npx prisma migrate dev --name init`). Deja claro que es el estado inicial del esquema.

**Para entornos de test**: usar otra base (ej. `DATABASE_URL` con otra BD) o restablecer esquema con `prisma migrate reset` cuando sea aceptable.

---

## 4. Por qué existen los campos sensibles

Nunca se guardan secretos en texto plano. Cada campo sensible tiene un motivo concreto:

| Campo | Motivo |
|-------|--------|
| **passwordHash** | La contraseña se hashea con Argon2 antes de guardar. Solo guardamos el hash; así, si hay fuga de BD, no se exponen contraseñas. En login se compara el hash de lo enviado con este valor. |
| **refreshTokenHash** | El refresh token que recibe el cliente se hashea y solo el hash se persiste. Si alguien accede a la BD no puede reutilizar tokens; al validar, se hashea el token recibido y se compara con este campo. |
| **resetTokenHash** | Token de un solo uso para “reset password” (enlace por email). Se guarda solo el hash. Evita que quien acceda a la BD pueda usar el token; además el token nunca se almacena en claro. |
| **resetTokenExpiresAt** | El token de reset debe caducar (ej. 1 h). Se guarda la fecha de expiración para comprobar en cada uso que el token sigue válido antes de cambiar la contraseña. |

En respuestas de la API no se devuelven estos campos (ni `passwordHash`, ni los hashes de tokens).

---

## 5. Seed del usuario admin

- **Archivo**: `backend/prisma/seed.ts`
- **Comportamiento**: si no existe usuario con el email configurado, crea uno con rol `ADMIN`, `status` `ACTIVE` y contraseña hasheada con Argon2.
- **Idempotencia**: si ya existe el admin, no hace nada.
- **Seguridad**: en producción, cambiar la contraseña del admin tras el primer acceso.

### Configuración de Prisma seed en package.json

Para que `npx prisma db seed` ejecute el script, en `backend/package.json` debe existir la clave `prisma.seed`. En este proyecto está configurado así (ts-node):

```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

Alternativas según el setup: `tsx prisma/seed.ts`, o compilar antes y usar `node dist/prisma/seed.js`. Sin esta configuración, `prisma db seed` no hace nada.

---

## 6. Qué sigue

**Fase 3 — Infraestructura backend**: proyecto NestJS, `ConfigModule.forRoot()` + `app.config.ts`, validación de env, `PrismaModule` + `PrismaService`, `AppModule` base.
