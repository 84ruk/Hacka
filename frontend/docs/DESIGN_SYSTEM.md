# Design system (frontend)

## Paleta

| Variable / Uso | Valor | Uso |
|----------------|--------|-----|
| `--primary` | `#4338ca` | Botones principales, enlaces, focus (WCAG AA) |
| `--primary-hover` | `#3730a3` | Hover en primary |
| `--primary-foreground` | `#ffffff` | Texto sobre primary (contraste ≥ 4.5:1) |
| `--background` | `#f8fafc` | Fondo de página |
| `--foreground` | `#0f172a` | Texto principal |
| `--card` | `#ffffff` | Fondo de tarjetas |
| `--card-border` | `#e2e8f0` | Borde de tarjetas |
| `--destructive` | `#b91c1c` | Acciones destructivas |
| `--success` | `#047857` | Estados éxito |
| `--warning` | `#b45309` | Advertencias |

Neutrales: escala slate (50–900) para texto secundario, bordes y fondos suaves.

### Alert (WCAG AA)

Variables `--alert-{variant}-bg`, `--alert-{variant}-border`, `--alert-{variant}-text` para `error`, `success`, `warning`, `info`. Texto oscuro sobre fondo claro; contraste ≥ 4.5:1.

### Badge (WCAG AA)

Variables `--badge-{variant}-bg`, `--badge-{variant}-text` para `default`, `success`, `warning`, `destructive`. Mismo criterio de contraste.

## Contraste WCAG 2.1 AA

- **Texto normal:** ratio ≥ 4.5:1 entre texto y fondo.
- **Texto grande** (18px+ o 14px bold): ≥ 3:1.
- **Primary:** `#4338ca` (indigo-700) con `#ffffff` cumple AA. Se evita indigo-600 para garantizar margen.
- **Alert:** fondos claros (red-50, emerald-50, amber-50, slate-50) con texto en tonos 800/900.
- **Badge:** fondos 100 con texto 700/800.
- **Toasts:** reutilizan las mismas variables que Alert.

Verificación recomendada: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) o [WCAG Color Checker](https://www.wcagcolorchecker.com/).

## Espaciado y radio

- `--radius`: 0.75rem (12px) — cards, modales.
- `--radius-sm`: 0.5rem (8px) — inputs, botones, badges.
- Contenedor: `max-w-4xl`, `px-4 py-6`, `sm:px-6 lg:px-8`.
- Gaps: `gap-3` a `gap-6` según jerarquía.

## Tipografía

- Títulos de página: `text-2xl font-bold tracking-tight text-slate-900`.
- Títulos de card: `text-lg font-semibold text-slate-900`.
- Descripción: `text-sm text-slate-500` o `text-slate-600`.
- Labels: `text-sm font-medium text-slate-700`.

## Componentes UI (`src/components/ui`)

- **Button**: variants `primary`, `secondary`, `outline`, `destructive`, `ghost`; sizes `sm`, `md`, `lg`; `isLoading`.
- **Input**: borde, focus ring con color primary, `aria-invalid` para errores.
- **Label**: asociado con `htmlFor` al input.
- **Card**: CardHeader, CardTitle, CardDescription, CardContent.
- **Alert**: variants `error`, `success`, `warning`, `info`; opcional `title`. Usa variables WCAG.
- **Badge**: variants `default`, `success`, `warning`, `destructive`. Usa variables WCAG.
- **Spinner**: indicador de carga.
- **Skeleton / SkeletonText**: placeholders de carga.
- **Modal**: overlay, título, cierre con Escape.

## Toasts globales

- **Contexto:** `ToastProvider` en `AppShell`; hook `useToast()`.
- **API:** `toast.success(message, { title?, duration? })`, `toast.error()`, `toast.warning()`, `toast.info()`.
- **Estilo:** mismo que Alert (variables `--alert-*`); posición fija top-right, auto-dismiss (default 5s), botón cerrar con `aria-label="Cerrar notificación"`.
- **Uso:** éxito al crear usuario (`/users`), éxito al restablecer contraseña (`/reset-password`).

## Accesibilidad

- Focus visible: `*:focus-visible` con outline 2px primary (globals.css).
- Labels: todos los inputs tienen `<Label htmlFor="id">` e `id` en el input.
- Errores: `aria-invalid`, `aria-describedby` apuntando al id del mensaje de error; mensaje con `role="alert"`.
- Tabla usuarios: `scope="col"` en headers, `aria-label` en el select de estado.
- Toasts: `role="region" aria-label="Notificaciones"` en el contenedor; cada toast `role="alert"`; botón cerrar con etiqueta accesible.
