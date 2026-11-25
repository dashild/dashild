# create-dashild

Crea una app Next.js con Dashild preconfigurado: panel, Prisma, autenticación y
un starter opcional, listos para `dev`.

```bash
pnpm create dashild@latest my-app
# o, sin instalar:
npx create-dashild@latest my-app
```

## Modo interactivo

Sin flags pregunta, en este orden:

1. Nombre y carpeta del proyecto.
2. Starter: `basic` (solo el panel) o `demo` (usuarios, posts y etiquetas).
3. Autenticación: Better Auth (email + contraseña) o ninguna.
4. Base de datos: PostgreSQL, MySQL o SQLite, y su `DATABASE_URL`.
5. Instalar dependencias, inicializar git, migrar y sembrar.

El panel queda en `/admin` por defecto.

## Flags

```bash
npx create-dashild@latest my-app \
  --template demo \
  --database postgresql \
  --database-url "$DATABASE_URL" \
  --pm pnpm \
  --yes
```

| Flag | Valores |
| --- | --- |
| `--template` | `basic`, `demo`, `local:<ruta>`, `github:<owner>/<repo>#<ref>` |
| `--auth` | `better-auth`, `none` |
| `--database` | `postgresql`, `mysql`, `sqlite` |
| `--database-url` | URL de conexión; se infiere el motor del esquema |
| `--direct-url` | URL sin pooler para las migraciones |
| `--pm` | `pnpm`, `npm`, `yarn`, `bun` |
| `--path` | Ruta del panel (por defecto `/admin`) |
| `--no-install` | No instala dependencias |
| `--no-git` | No inicializa git |
| `--no-migrate` | No aplica el esquema |
| `--no-seed` | No carga los datos del starter |
| `--dry-run` | Imprime el plan sin escribir nada |
| `--list-templates` | Lista los starters incluidos |
| `-y, --yes` | Acepta los valores por defecto |

La base de datos no se levanta en Docker: apunta `DATABASE_URL` a un PostgreSQL,
MySQL o SQLite que ya exista (Neon, Supabase, PlanetScale, un archivo local…).
Si la base no está disponible, el proyecto se crea igual y las migraciones y el
seed quedan como pasos pendientes en la salida.

## Starters

Un starter es una carpeta con `template.json` y archivos del proyecto:

```json
{
  "name": "mi-starter",
  "version": "1.0.0",
  "dashild": ">=0.1.0-alpha.2",
  "prisma": { "provider": ["postgresql"] },
  "requires": { "auth": ["better-auth"] },
  "extend": { "User": ["role Role @default(USER)"] }
}
```

- `prisma/models.prisma` se añade al esquema con marcadores para no duplicarse.
- `extend` añade campos a modelos que ya existen (por ejemplo `User`).
- `src/dashild/resources/*.ts` se copian y se registran en `panel.ts`.
- `src/dashild/policies.ts` reemplaza las políticas por defecto.
- `prisma/seed.ts` se ejecuta con `--seed`.

Solo se cargan starters incluidos, locales (`local:`) o de GitHub
(`github:`). No hay carga desde npm en esta versión.

## Desarrollo en el monorepo

```bash
pnpm --filter create-dashild build
pnpm --filter create-dashild test
node packages/create-dashild/dist/index.js mi-app --dry-run
```
