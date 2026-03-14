# Checklist de demo (5–7 min)

Guion para mostrar el proyecto en un hackatón. Tener **backend** (puerto 3001) y **frontend** (puerto 3000) en marcha, con Postgres levantado y seed aplicado (usuario admin: `admin@example.com` / `Admin123!`).

---

## 1. Registro y login (≈1 min)

1. Abrir http://localhost:3000.
2. Ir a **Registrarse**.
3. Introducir email y contraseña (mín. 8 caracteres) y enviar.
4. Comprobar redirección a **Dashboard** y mensaje de bienvenida.
5. **Cerrar sesión** (botón en la navbar).
6. Ir a **Iniciar sesión**, mismo email y contraseña → de nuevo **Dashboard**.

---

## 2. Dashboard y perfil (≈1 min)

1. Con sesión iniciada, ir a **Dashboard**.
2. Clic en **Ver perfil** (o enlace **Perfil** en la navbar).
3. Comprobar que se muestran **email**, nombre, **rol** (USER) y **estado** (ACTIVE).

---

## 3. Usuario normal → 403 en /users (≈1 min)

1. Seguir logueado como **usuario recién registrado** (rol USER).
2. Escribir en la barra de direcciones: http://localhost:3000/users (o intentar acceder si el enlace “Usuarios” no aparece para USER).
3. Comprobar que se muestra la pantalla **“Sin permisos”** con el botón **“Ir al Dashboard”** (comportamiento 403 en la UX).

---

## 4. Admin → /users y cambio de estado (≈1–2 min)

1. Cerrar sesión y volver a **Iniciar sesión**.
2. Iniciar sesión como **admin**:  
   - Email: `admin@example.com`  
   - Contraseña: `Admin123!`
3. Ir a **Usuarios** (enlace visible en la navbar para ADMIN).
4. Comprobar que se ve la **tabla de usuarios** y el formulario **“Crear usuario”**.
5. En la tabla, cambiar el **estado** de un usuario (select ACTIVE / INACTIVE / SUSPENDED) y comprobar que se actualiza.

(Opcional: crear un usuario nuevo desde el formulario y verlo en la tabla.)

---

## 5. Swagger /docs (≈1 min)

1. Abrir en el navegador: http://localhost:3001/docs.
2. Mostrar la documentación **Swagger** de la API: auth (register, login, refresh, logout, me, forgot-password, reset-password) y users (CRUD, solo ADMIN).
3. (Opcional) Probar **POST /auth/login** desde Swagger con `admin@example.com` / `Admin123!` y ver la respuesta con `accessToken` y `refreshToken`.

---

## 6. Tests pasando (≈1 min)

En terminal:

```bash
# Backend: unit + e2e (con BD de test levantada y migrada)
cd backend
npm run test:db:up
npm run test:db:migrate
npm run test:unit
npm run test:e2e
```

```bash
# Frontend: Playwright E2E (con frontend y backend en marcha en otras terminales)
cd frontend
npm run e2e
```

Comentar brevemente qué cubren: registro/login, logout, 403 para USER en /users, admin en /users y cambio de estado, perfil con datos del usuario.

---

## Resumen

| Paso | Qué mostrar |
|------|-------------|
| 1    | Registro → dashboard; logout; login |
| 2    | Dashboard y perfil con datos del usuario |
| 3    | USER en /users → “Sin permisos” (403 UX) |
| 4    | ADMIN en /users → lista y cambio de estado |
| 5    | Swagger en /docs |
| 6    | Comandos de tests (unit, e2e backend, Playwright) |

Tiempo total orientativo: **5–7 minutos**.
