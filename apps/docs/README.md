# @dashild/docs

Sitio de documentación de Dashild con Astro + Starlight.

- Inglés en `/` (idioma principal).
- Español en `/es` (espejo traducido).
- Contenido: `src/content/docs` para inglés y `src/content/docs/es` para español.
- Búsqueda con Pagefind, modo claro/oscuro y selector de idioma incluidos.

```bash
pnpm docs:dev      # desde la raíz del monorepo
pnpm docs:build
pnpm docs:preview
```

El despliegue es estático: `apps/docs/dist`. El dominio configurado es
`https://docs.dashild.dev`; cámbialo en `astro.config.mjs` si usas otro.

## Versiones

Astro queda en 6.x y Starlight en 0.40.x a propósito. Astro 7 usa Vite 8 y
Rolldown, cuyo binario x64 requiere AVX2; esta máquina no lo tiene y el build
muere con SIGILL. Actualiza cuando el hardware (o un CI con AVX2) lo soporte.

La búsqueda usa Pagefind. El binario de indexado es nativo y necesita AVX2; en
esta máquina el build local no genera `dist/pagefind` (el CI sí, porque sus
runners tienen AVX2). Para construir en local sin buscador y evitar que el hook
nativo corte el sitemap:

```bash
DOCS_PAGEFIND=false pnpm docs:build
```

## Deploy en Vercel

1. Importa el repositorio en Vercel y pon **Root Directory** en `apps/docs`.
2. Framework: **Astro**. Build: `pnpm build`; Output: `dist`.
3. Sin dominio propio, Vercel asigna `<proyecto>.vercel.app`. El sitio toma la
   URL de producción de `VERCEL_PROJECT_PRODUCTION_URL` para canonical,
   hreflang y sitemap.
4. Cuando tengas dominio, define `SITE_URL=https://docs.tudominio.com` en las
   variables de entorno de Vercel.

También puedes desplegar desde la CLI:

```bash
vercel --cwd apps/docs
vercel --cwd apps/docs --prod
```
