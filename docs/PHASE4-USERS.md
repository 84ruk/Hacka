# Fase 4 — Módulo Users. Decisiones y aclaraciones

## 1. POST /users y password en CreateUserDto

**Decisión:** POST /users es **creación administrativa** (un admin crea un usuario con email + password en el body).

- No se mezcla con el futuro register de auth: **AuthService.register()** (Fase 5) reutilizará **UsersService.create()** con el mismo DTO (email, password, firstName, lastName). Auth no tendrá un “create user” duplicado; solo llamará a `usersService.create(registerDto)` y opcionalmente emitirá tokens.
- Un solo método reutilizable: `UsersService.create(dto)` hashea la contraseña y persiste; tanto el controller de users como el de auth lo usan.

## 2. UserResponse: tipo exacto

**Definición:** Es un **type alias** sobre el modelo Prisma `User`, no una interfaz ni un DTO de salida:

```ts
export type UserResponse = Omit<
  User,
  'passwordHash' | 'refreshTokenHash' | 'resetTokenHash' | 'resetTokenExpiresAt'
>;
```

- Se mantiene en sincronía con Prisma: si el schema User cambia, UserResponse refleja los mismos campos menos los omitidos.
- No es una clase ni interfaz propia, para no duplicar tipos y no romper con los tipos generados por Prisma.
- Las respuestas del controller devuelven este tipo; `toResponse(user)` en el service hace el omit y devuelve `UserResponse`.

## 3. package.json en Fase 4

En esta fase solo se **añadieron** dos dependencias en `dependencies`; no se quitó ni se modificó nada más:

- `class-validator`
- `class-transformer`

El resto del `package.json` (scripts, prisma.seed, Nest, Prisma, argon2, joi, etc.) se mantiene igual. A continuación el contenido actual para verificación.

```json
{
  "name": "backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "prisma db seed",
    "prisma:studio": "prisma studio"
  },
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@types/node": "^20.10.0",
    "prisma": "^5.22.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.0"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@prisma/client": "^5.22.0",
    "argon2": "^0.41.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "joi": "^17.11.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0"
  }
}
```

Si en el futuro se añaden más paquetes (p. ej. Passport, JWT), se hará en las fases correspondientes sin tocar lo ya documentado aquí salvo que sea necesario.
