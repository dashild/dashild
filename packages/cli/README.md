# @dashild/cli

Binario `dashild`.

## `make:resource <Model>`

```bash
pnpm dashild make:resource Organization
```

Lee `dashild-metadata.json`, usa **la tabla de mapeo de `@dashild/core`** y escribe un único archivo:

```text
src/dashild/resources/organization.ts
```

- **Write-once**: si el archivo existe, no se sobrescribe. El recurso es del desarrollador.
- Omite `id`, `@updatedAt`, las FK que escribe una relación y listas escalares.
- Incluye `Bytes` en el formulario y relaciones m2m como multiselect. o2m no se genera como campo: se gestiona con el relation manager del padre, y el modelo hijo necesita su propio recurso.
- Genera columnas, campos de formulario, búsqueda y filtros a partir de los metadatos.
- Los campos de auditoría (`createdAt`, `updatedAt`, `deletedAt`) aparecen en la tabla pero no en el formulario.
- Etiquetas y slugs se derivan del modelo (`BlogPost` → `blog-post.ts`, `Blog Posts`, `blog-posts`); se editan después.
- Por defecto añade el recurso a `panel.resources` y una entrada **fail-closed** en `policies.ts` (`scope: () => null`). Edita esa entrada para definir el ámbito y los permisos.
- `--no-register` deja `panel.ts` y `policies.ts` intactos.

Opciones:

| Opción | Uso |
| --- | --- |
| `--cwd <dir>` | Raíz del proyecto (por defecto el directorio actual) |
| `--metadata <path>` | Ruta explícita a `dashild-metadata.json` |
| `--dir <path>` | Carpeta de recursos (por defecto `src/dashild/resources`) |
| `--no-register` | No añade el recurso a `panel.ts` ni a `policies.ts` |
| `--dry-run` | Imprime el archivo sin escribirlo |

Rutas de metadatos que busca por defecto: `src/generated/dashild/`, `generated/dashild/` y `prisma/generated/dashild/`.

## `init`

```bash
pnpm dashild init --auth better-auth
pnpm dashild init --auth better-auth --yes
pnpm dashild init --auth none --yes
pnpm dashild init --dry-run
```

Añade el panel a una app Next.js existente. Escribe solo el pegamento de la app:

```text
src/dashild/panel.ts          configuración y adaptador de auth a completar
src/dashild/policies.ts       políticas fail-closed, sin recursos
src/dashild/actions/index.ts  registro de handlers
src/dashild/icons.tsx         IconProvider + iconos propios
src/dashild/runtime.ts        Prisma + metadata + panel + policies
src/dashild/server.ts         server actions (save/delete/action)
src/dashild/registry.tsx      RegistryProvider para celdas/campos propios
src/app/<ruta>/[[...dashild]]/page.tsx
```

Con `--auth better-auth` añade además:

```text
src/lib/auth.ts
src/lib/auth-client.ts
src/lib/session.ts
src/lib/auth-actions.ts
src/lib/email.ts
src/app/api/auth/[...all]/route.ts
src/app/login/page.tsx
src/app/signup/page.tsx
src/app/forgot-password/page.tsx
src/app/reset-password/page.tsx
src/components/dashild/login-form.tsx
src/components/dashild/signup-form.tsx
src/components/dashild/forgot-password-form.tsx
src/components/dashild/reset-password-form.tsx
```

Añade `better-auth` a `package.json` y los modelos `User`, `Session`, `Account`
y `Verification` a `prisma/schema.prisma` si no existen. También añade
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ALLOW_SIGNUP` y
`REQUIRE_EMAIL_VERIFICATION` a `.env.example`.

La configuración generada activa rate limiting (100/minuto), permite cerrar el
signup público con `ALLOW_SIGNUP="false"`, exige verificación con
`REQUIRE_EMAIL_VERIFICATION="true"` y monta el flujo de reset de contraseña.
`src/lib/email.ts` es un stub: registra el correo en desarrollo y falla en
producción hasta que conectes Resend, Postmark, SES o tu transporte.

Añade el script `dashild` a `package.json` si falta. **No toca** `middleware.ts`/`proxy.ts`, el layout raíz, `next.config`, `.env` ni los archivos de autenticación.

- `--auth <none|better-auth>` elige la integración. Por defecto `none` para no tocar una autenticación existente.
- `--path <ruta>` elige la ruta de montaje. Si `/admin` ya tiene una `page.tsx`, propone `/panel`, `/admin-panel` o `/dashild`.
- `--yes` escribe; sin él, solo muestra el plan. `--dry-run` nunca escribe.
- `--force` sobrescribe archivos existentes. Sin `--force`, se niega para no pisar trabajo manual.
- Avisa si falta un cliente Prisma o alguna dependencia de Dashild.

## `ui:add <componente>`

```bash
pnpm dashild ui:add avatar-cell
pnpm dashild ui:add email-field
```

Copia una plantilla a `components/dashild/` (o `--dir`). Plantillas disponibles:

- `avatar-cell`: celda con iniciales.
- `email-field`: campo de email con ayuda.

No modifica `registry.tsx`: imprime la llamada `registerCell`/`registerField` que debes añadir. Opciones: `--cwd`, `--dir`, `--force`, `--dry-run`.

## `doctor`

```bash
pnpm dashild doctor
pnpm dashild doctor --json
```

Parsea `src/dashild/resources/*.ts` (no los importa: `panel.ts` arrastra Next) y los compara con `dashild-metadata.json`:

- modelo y `navigation.slug`,
- columnas, filtros y campos de formulario,
- relaciones y su `display`,
- campos de solo lectura en el formulario,
- `policy` presente y con `scope`,
- entrada del modelo en `policies.ts`,
- handlers de acciones personalizadas en `actions/index.ts`,
- predicados `requires` de acciones en `policies.ts`,
- slugs duplicados.

Indica archivo y línea, sugiere el arreglo y sale con código 1 si hay errores. `--json` es para CI.

## `eject`

```bash
pnpm dashild eject
pnpm dashild eject --yes
```

Retira lo que escribió `init`: `panel.ts`, `policies.ts`, `actions/index.ts`,
`icons.tsx`, `runtime.ts`, `server.ts`, `registry.tsx`, la ruta de montaje y el
script `dashild` de `package.json`. No toca recursos, autenticación, schema ni
dependencias; los lista como “Kept”.

Sin `--yes` solo muestra el plan. Usa `--path` si no puede leer la ruta de
`panel.ts` y `--dry-run` para forzar el modo simulación.

## Comandos

| Comando | Estado |
| --- | --- |
| `init` | Funcionando |
| `make:resource` | Funcionando |
| `doctor` | Funcionando |
| `ui:add` | Funcionando |
| `eject` | Funcionando |

## Tests

```bash
pnpm --filter @dashild/cli test
```

Verifican `make:resource`, `doctor`, `init`, `ui:add`, `register` y `eject` con proyectos y metadatos sintéticos: navegación, columnas, formulario, filtros, omisiones, nombres, plan de escritura, conflicto de ruta, registro de recursos y fallo cerrado.
