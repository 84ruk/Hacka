# Auditoría técnica integral — Backend + Frontend

**Rol:** Principal Engineer / Security-minded Architect  
**Alcance:** Enfoque, arquitectura, seguridad, performance, testing y recomendaciones.  
**Estado de referencia:** Backend NestJS (auth/users/cookies/CSRF) + Frontend Next.js (cookies, AuthContext, AppShell).

---

## 1. Conclusión general

**¿Estamos bien?** **Sí, con matices.**

- **Correcto:** El sistema cumple los objetivos de auth, usuarios, roles, recuperación de contraseña y sesión por cookies. La arquitectura es modular, la sanitización está aplicada y el flujo de tokens (hash de refresh, cookies httpOnly, CSRF) sigue buenas prácticas.
- **Óptimo para hackatón:** Sí: simplicidad sin comprometer seguridad crítica (Argon2, hashes, mensajes neutros, cookies). La evolución hacia AuthContext/AppShell mejora la reactividad sin sobreingeniería.
- **Riesgos acotados:** No hay rate limiting en login (riesgo brute-force aceptable para MVP si el entorno es controlado). JWT strategy consulta DB en cada request (tradeoff aceptable para escalar después con caché). No se inventan archivos ni endpoints; la auditoría se basa en el código actual.

**Por qué “con matices”:** Hay mejoras P1 (rate limit en login, documentar dominio de cookies) y P2 (caché de usuario en JWT, tests de refresh replay) que conviene planificar; ninguna es bloqueante para demo o hackatón.

---

## 2. Checklist de cumplimiento

| Área | Estado | Observaciones |
|------|--------|----------------|
| **Arquitectura backend modular** | ✅ | users, auth, common, config, prisma, mail separados; controllers delgados, lógica en services. |
| **Modelo User y sanitización** | ✅ | UserResponse omite passwordHash, refreshTokenHash, resetTokenHash, resetTokenExpiresAt; toResponse consistente. |
| **Auth: registro/login** | ✅ | Register crea USER/ACTIVE; login mensaje neutro ("Invalid credentials"); Argon2 para contraseñas. |
| **Auth: refresh/logout** | ✅ | Refresh token validado por hash en BD; logout invalida refresh (hash a null); acepta token por body o cookie. |
| **Auth: cookies** | ✅ | access/refresh en cookies httpOnly (auth.cookies.ts); clearCookie sin maxAge (compatible Express 5). |
| **Auth: JWT strategy** | ✅ | Lee token de cookie o Bearer; valida type 'access'; comprueba UserStatus.ACTIVE vía findOne. |
| **CSRF** | ✅ | Middleware exige X-CSRF-Token en métodos no safe si hay cookie de sesión; auth_csrf_token no httpOnly (necesario para leer en cliente). |
| **Reset password** | ✅ | Forgot respuesta neutra; reset token con hash y expiración; tras reset se limpia refresh (re-login). |
| **Roles y autorización** | ✅ | @Roles(ADMIN) + RolesGuard en UsersController; 403 coherente. |
| **Config y ENV** | ✅ | env-resolver única regla; NODE_ENV=test con DATABASE_URL_TEST fail-fast; Joi para validación. |
| **Tests backend** | ✅ | Unit (auth.service, roles.guard) y e2e (auth, users, password-reset); BD test aislada (Docker 5434). |
| **Frontend: sesión** | ✅ | **Cookies únicamente:** no hay tokens en localStorage; credentials: 'include'; backend establece cookies. |
| **Frontend: AuthContext** | ✅ | Estado único (AuthProvider); setUser tras login/register; AppShell envuelve Navbar + children. |
| **Frontend: 401/403/409** | ✅ | 401 → refresh en api.ts y en useAuth; 403 UX "sin permisos"; 409 en formularios (email existente). |
| **Frontend: interceptor 401** | ✅ | api.ts hace refresh + retry una vez en 401 (excluye rutas /auth/*). |
| **Rate limiting login** | ⚠️ | No implementado; riesgo brute-force; aceptable para MVP en entorno controlado. |
| **Exposición en errores** | ✅ | Mensajes neutros; no se filtran stack traces al cliente en producción (revisar NODE_ENV en prod). |
| **Escalabilidad SaaS** | ✅ | tenantId en modelo; módulos desacoplados; preparado para multi-tenant real con filtros por tenant. |

---

## 3. Riesgos P0 (críticos) + mitigación

| Riesgo | Mitigación |
|--------|------------|
| **Ninguno P0 identificado** | El diseño actual (cookies httpOnly, hashes, CSRF, sanitización, sin tokens en cliente) no presenta fallos de seguridad críticos para el contexto descrito. |

**Verificación recomendada (sin cambiar sistema):** Confirmar que en producción no se expongan stack traces (NestJS con `NODE_ENV=production`) y que `JWT_SECRET` y `COOKIE_*` estén fijados de forma segura (env/secret manager).

---

## 4. Mejoras P1 (importantes) + costo/beneficio

| Mejora | Descripción | Costo | Beneficio |
|--------|-------------|-------|-----------|
| **Rate limit en login** | Throttle por IP (o por email) en POST /auth/login (ej. @nestjs/throttler o middleware custom: N intentos por ventana). | Bajo (1–2 h) | Reduce brute-force; buena práctica en cualquier entorno. |
| **Documentar dominio de cookies** | En docs/README: mismo origen (localhost vs 127.0.0.1) para dev; en producción mismo dominio o configuración explícita de dominio de cookie si hay subdominios. | Bajo | Evita “la sesión no persiste” por confusión de origen. |
| **Validar JWT_SECRET en arranque** | Comprobar longitud mínima (ej. ≥32 caracteres) en env.schema o bootstrap; fallar rápido si es débil. | Muy bajo | Evita secretos triviales en producción. |
| **Tests: refresh token replay** | E2E que tras usar un refresh token una vez, el segundo uso devuelva 401 (token invalidado). | Bajo | Asegura rotación correcta de refresh. |

Ninguna es bloqueante para hackatón; son mejoras de robustez y documentación.

---

## 5. Mejoras P2 (nice-to-have) + cuándo hacerlas

| Mejora | Cuándo |
|--------|--------|
| **Caché de usuario en JWT** | Cuando la carga de GET /auth/me (y validate()) sea cuello de botella: incluir claims mínimos (id, role, status) en el access token y reducir o eliminar findOne en cada request; seguir validando status si se cachea. |
| **Rate limit por usuario** | Tras tener rate por IP: limitar intentos de login por email (ej. 5 intentos / 15 min) para evitar ataques dirigidos. |
| **Auditoría de accesos** | Para SaaS: módulo audit (login, cambios de rol/status, accesos a recursos sensibles) con registro inmutable. |
| **Health check con DB** | Endpoint /health que compruebe conexión a PostgreSQL; útil para orquestadores y monitoreo. |
| **Swagger solo en no-production** | Ya aplicado (NODE_ENV !== 'production'); asegurar en producción que /docs no esté expuesto. |

---

## 6. Decisiones MVP vs Producción

| Tema | MVP / Hackatón (aceptable) | Producción / SaaS (recomendado) |
|------|----------------------------|----------------------------------|
| **Sesión** | Cookies httpOnly desde backend; frontend con credentials: 'include'. **Implementado.** | Mantener; opcional: mismo sitio estricto (SameSite=Strict) si no hay cross-site. |
| **Rate limiting** | No implementado; aceptable si el entorno es controlado. | Rate limit en login (y opcional en registro/forgot-password). |
| **JWT validate() + DB** | findOne en cada request protegido; simple y correcto. | Valorar caché (Redis/memoria) por userId o incluir claims en JWT para reducir DB. |
| **CSRF** | Cookie + header X-CSRF-Token en mutaciones. **Implementado.** | Mantener; en SPAs con mismo origen, SameSite=Lax ya mitiga. |
| **Mensajes de error** | Neutros en login/forgot; sin stack en respuestas. | Revisar que logs internos no expongan datos sensibles; monitoreo de intentos fallidos. |
| **Multi-tenant** | tenantId en modelo; sin filtro por tenant aún. | Filtro obligatorio por tenantId en queries; política de aislamiento. |
| **Tests** | Unit + e2e con BD test aislada. | Añadir tests de seguridad (replay, expiración real, permisos) y, si aplica, tests de carga. |

---

## 7. Siguientes pasos recomendados (orden)

1. **Documentar** en README (o docs) la convención de puertos y que frontend y backend deben usar el mismo host (localhost o 127.0.0.1) en dev para que las cookies funcionen.
2. **Añadir** validación de longitud mínima de `JWT_SECRET` en `env.schema` (ej. `.min(32)`) y, si se quiere, en bootstrap.
3. **Implementar** rate limiting en `POST /auth/login` (y opcionalmente en register/forgot) con @nestjs/throttler o middleware.
4. **Añadir** test e2e que verifique que un refresh token no puede reutilizarse tras un uso exitoso (replay devuelve 401).
5. **Revisar** que en producción `NODE_ENV=production` y que `/docs` no esté accesible (ya condicionado en código).
6. **Cuando escale:** valorar caché de usuario en validate() o claims en JWT y módulo de auditoría.

---

*Auditoría basada en el código actual del repositorio; no se ha asumido implementación fuera de lo descrito o de los archivos revisados.*
