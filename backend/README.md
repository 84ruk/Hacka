# Backend — NestJS + Prisma

API REST de autenticación y usuarios.

## Requisitos

- Node.js 18+
- PostgreSQL (local o contenedor Docker en puerto 5433)

## Instalación

```bash
npm install
cp .env.example .env
```

Editar `.env` y definir al menos `DATABASE_URL`. Si usas el Docker del proyecto: puerto **5433**.

## Base de datos

### Generar cliente Prisma

```bash
npx prisma generate
```

### Primera migración

```bash
npx prisma migrate dev --name init
```

### Seed (superadmin y admin)

```bash
npx prisma db seed
```

Crea dos usuarios (si no existen) con credenciales solo para desarrollo/demo:

| Rol        | Email                   | Contraseña      |
|-----------|-------------------------|-----------------|
| SUPERADMIN| `superadmin@example.com`| `SuperAdmin123!`|
| ADMIN     | `admin@example.com`     | `Admin123!`     |

Definidos en `prisma/seed.ts`. SUPERADMIN y ADMIN pueden acceder a la gestión de usuarios (`/users`).

### Prisma Studio

```bash
npx prisma studio
```

Abre la UI en el navegador para ver/editar datos.

## Variables de entorno

| Variable     | Requerida | Default   | Uso                    |
|-------------|-----------|-----------|------------------------|
| DATABASE_URL| Sí        | —         | Conexión PostgreSQL    |
| JWT_SECRET  | Sí (auth) | —         | Clave para firmar JWT   |
| JWT_ACCESS_EXPIRATION | No | 15m    | Caducidad access token |
| JWT_REFRESH_EXPIRATION | No | 7d   | Caducidad refresh token|
| PORT        | No        | 3000      | Puerto del servidor    |
| NODE_ENV    | No        | development | Entorno              |

La app no arranca si falla la validación (p. ej. `DATABASE_URL` o `JWT_SECRET` vacíos). Ver `src/config/env.schema.ts`.

## Scripts

| Script           | Descripción                          |
|------------------|--------------------------------------|
| `npm run build`  | Compila a `dist/`                    |
| `npm run start`  | Ejecuta la app (compilada)            |
| `npm run start:dev` | Modo desarrollo con watch         |
| `npm run start:debug` | Modo desarrollo con inspector   |
| `npm run prisma:generate` | Genera cliente Prisma         |
| `npm run prisma:migrate` | Migraciones (dev)             |
| `npm run prisma:seed`    | Ejecuta seed                  |
| `npm run prisma:studio`  | Abre Prisma Studio            |

## Estructura actual (Fase 3)

```
backend/
├── prisma/
│   ├── schema.prisma    # Modelo User, enums Role/UserStatus
│   ├── migrations/
│   └── seed.ts          # Usuario admin inicial
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   ├── env.schema.ts   # Validación Joi de env
│   │   └── app.config.ts   # Carga config al arranque
│   └── prisma/
│       ├── prisma.module.ts
│       └── prisma.service.ts
├── .env.example
├── nest-cli.json
├── package.json
└── tsconfig.json
```

## Configuración (ConfigModule)

Se usa `@nestjs/config` sin módulo propio:

- **env.schema.ts**: schema Joi para validar variables de entorno.
- **app.config.ts**: función cargada con `ConfigModule.forRoot({ load: [appConfig] })`. Valida al arrancar y expone `PORT`, `NODE_ENV`, `DATABASE_URL`.
- Uso en código: inyectar `ConfigService` y llamar a `config.get('DATABASE_URL')`, etc.

## Prisma

- **PrismaService**: extiende `PrismaClient`, se conecta en `onModuleInit` y desconecta en `onModuleDestroy`.
- **PrismaModule**: `@Global()`, exporta `PrismaService` para inyectarlo en cualquier módulo.

## Auth (decisiones MVP)

- **Logout:** el refresh token se envía en el **body** de `POST /auth/logout` (MVP). En producción suele usarse cookie **httpOnly** para el refresh token; esta API no lo implementa por defecto.
- **Tokens:** access token en header `Authorization: Bearer <token>`; refresh token en body en `/auth/refresh` y `/auth/logout`.

## Más documentación

- Raíz del repo: [../README.md](../README.md)
- Arquitectura y fases: [../docs/README.md](../docs/README.md)
