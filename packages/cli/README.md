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
- Omite `id`, `@updatedAt`, las FK que escribe una relación, `Bytes`, listas y relaciones o2m/m2m.
- Genera columnas, campos de formulario, búsqueda y filtros a partir de los metadatos.
- Los campos de auditoría (`createdAt`, `updatedAt`, `deletedAt`) aparecen en la tabla pero no en el formulario.
- Etiquetas y slugs se derivan del modelo (`BlogPost` → `blog-post.ts`, `Blog Posts`, `blog-posts`); se editan después.

Opciones:

| Opción | Uso |
| --- | --- |
| `--cwd <dir>` | Raíz del proyecto (por defecto el directorio actual) |
| `--metadata <path>` | Ruta explícita a `dashild-metadata.json` |
| `--dir <path>` | Carpeta de recursos (por defecto `src/dashild/resources`) |
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
src/app/<ruta>/[[...dashild]]/page.tsx
```

Con `--auth better-auth` añade además:

```text
lib/auth.ts
lib/auth-client.ts
lib/session.ts
lib/auth-actions.ts
app/api/auth/[...all]/route.ts
app/login/page.tsx
app/signup/page.tsx
components/dashild/login-form.tsx
components/dashild/signup-form.tsx
```

Añade `better-auth` a `package.json` y los modelos `User`, `Session`, `Account`
y `Verification` a `prisma/schema.prisma` si no existen. También añade
`BETTER_AUTH_SECRET` y `BETTER_AUTH_URL` a `.env.example`.

Añade el script `dashild` a `package.json` si falta. **No toca** `middleware.ts`/`proxy.ts`, el layout raíz, `next.config`, `.env` ni los archivos de autenticación.

- `--auth <none|better-auth>` elige la integración. Por defecto `none` para no tocar una autenticación existente.
- `--path <ruta>` elige la ruta de montaje. Si `/admin` ya tiene una `page.tsx`, propone `/panel`, `/admin-panel` o `/dashild`.
- `--yes` escribe; sin él, solo muestra el plan. `--dry-run` nunca escribe.
- `--force` sobrescribe archivos existentes. Sin `--force`, se niega para no pisar trabajo manual.
- Avisa si falta un cliente Prisma o alguna dependencia de Dashild.

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
- slugs duplicados.

Indica archivo y línea, sugiere el arreglo y sale con código 1 si hay errores. `--json` es para CI.

## Estado del resto de comandos

| Comando | Estado |
| --- | --- |
| `init` | Funcionando |
| `doctor` | Funcionando |
| `ui:add` | Pendiente (fase 2) |
| `eject` | Pendiente (fase 2) |

El CLI solo imprime ayuda y versión para los pendientes; no finge que funcionan.

## Tests

```bash
pnpm --filter @dashild/cli test
```

Verifican `make:resource`, `doctor` e `init` con proyectos y metadatos sintéticos: navegación, columnas, formulario, filtros, omisiones, nombres, plan de escritura, conflicto de ruta y fallo cerrado.
