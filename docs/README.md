# @dashild/docs

Dashild documentation site built with Astro + Starlight.

- English at `/` (primary language).
- Spanish at `/es` (translated mirror).
- Content: `src/content/docs` for English and `src/content/docs/es` for Spanish.
- Pagefind search, light/dark mode, and a language picker included.

```bash
pnpm docs:dev      # from the monorepo root
pnpm docs:build
pnpm docs:preview
```

The deployment is static: `docs/dist`. Production:
<https://dashild.vercel.app> (English) and <https://dashild.vercel.app/es>
(Spanish). When a custom domain exists, set `SITE_URL` in Vercel.

## Versions

Astro stays on 6.x and Starlight on 0.40.x on purpose. Astro 7 uses Vite 8 and
Rolldown, whose x64 binary requires AVX2; this machine does not have it and the
build dies with SIGILL. Upgrade when the hardware (or a CI runner with AVX2)
supports it.

Search uses Pagefind. Its indexing binary is native and requires AVX2; on this
machine the local build does not generate `dist/pagefind` (CI does, because its
runners have AVX2). To build locally without search and avoid the native hook
cutting off the sitemap:

```bash
DOCS_PAGEFIND=false pnpm docs:build
```

## Deploy on Vercel

1. Import the repository in Vercel and set **Root Directory** to `docs`.
2. Framework: **Astro**. Build: `pnpm build`; Output: `dist`.
3. Without a custom domain, Vercel assigns `<project>.vercel.app`. The site uses
   `VERCEL_PROJECT_PRODUCTION_URL` for canonical URLs, hreflang, and the sitemap.
4. When you have a domain, set `SITE_URL=https://docs.yourdomain.com` in the
   Vercel environment variables.

You can also deploy from the CLI. The Vercel project is linked from the
repository root (its **Root Directory** is `docs`), so run it from there:

```bash
vercel link   # once per clone
vercel --prod
```
