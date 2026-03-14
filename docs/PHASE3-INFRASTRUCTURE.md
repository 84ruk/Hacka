# Fase 3 — Infraestructura backend

Configuración base de NestJS, configuración con validación de env y módulo Prisma.

## Entregables

| Entregable | Ubicación |
|------------|-----------|
| Bootstrap | `backend/src/main.ts` |
| AppModule | `backend/src/app.module.ts` |
| Validación env | `backend/src/config/env.schema.ts` |
| Carga de config | `backend/src/config/app.config.ts` |
| PrismaService | `backend/src/prisma/prisma.service.ts` |
| PrismaModule | `backend/src/prisma/prisma.module.ts` |
| Nest CLI / TS | `backend/nest-cli.json`, `backend/tsconfig.json`, `backend/tsconfig.build.json` |

## Configuración (@nestjs/config)

- No se usa módulo ni servicio de config propios; solo `ConfigModule` y `ConfigService` de Nest.
- **env.schema.ts**: schema Joi con `NODE_ENV`, `PORT` (opcional, default 3000), `DATABASE_URL` (obligatorio). Si la validación falla al arrancar, la app lanza y no inicia.
- **app.config.ts**: función que valida `process.env` con el schema y devuelve `{ PORT, NODE_ENV, DATABASE_URL }`. Se registra con `ConfigModule.forRoot({ isGlobal: true, load: [appConfig] })`.

## Prisma

- **PrismaService**: extiende `PrismaClient`, implementa `OnModuleInit` (`$connect`) y `OnModuleDestroy` (`$disconnect`).
- **PrismaModule**: `@Global()`, provee y exporta `PrismaService` para que cualquier módulo pueda inyectarlo sin importar PrismaModule de forma explícita.

## Arranque

- **main.ts**: crea la aplicación con `NestFactory.create(AppModule)`, obtiene `PORT` con `ConfigService` (por defecto 3000) y llama a `listen(port)`.

## Scripts añadidos

- `npm run build` — compila con Nest CLI.
- `npm run start` — ejecuta la app compilada.
- `npm run start:dev` — modo desarrollo con watch.
- `npm run start:debug` — desarrollo con inspector.

## Dependencias añadidas

- NestJS: `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/config`
- `joi` para validación de variables de entorno
- Dev: `@nestjs/cli`

## Qué sigue

**Fase 4 — Módulo Users**: DTOs, UsersService (CRUD, desactivar por status, sin delete físico), UsersController, no exponer campos sensibles en respuestas.
