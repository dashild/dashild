// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";

// SITE_URL wins (custom domain). On Vercel, use the production domain so
// canonical URLs, hreflang and the sitemap point at the deployed site.
const site = (
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://dashild.vercel.app")
).replace(/\/$/, "");

export default defineConfig({
  site,
  integrations: [
    starlight({
      title: "Dashild",
      description: "The application admin layer for Next.js.",
      logo: {
        light: "./src/assets/logo.svg",
        dark: "./src/assets/logo-dark.svg",
        alt: "Dashild",
      },
      customCss: ["./src/styles/docs-theme.css"],
      expressiveCode: {
        // Editor colors; Starlight keeps them in sync with the site theme.
        themes: ["github-dark", "github-light"],
        useStarlightUiThemeColors: true,
      },
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
        es: { label: "Español", lang: "es" },
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/dashild/dashild",
        },
      ],
      editLink: {
        baseUrl:
          "https://github.com/dashild/dashild/edit/main/apps/docs/",
      },
      lastUpdated: true,
      // Pagefind is native and needs AVX2. On older CPUs:
      // DOCS_PAGEFIND=false pnpm docs:build
      pagefind: process.env.DOCS_PAGEFIND !== "false",
      sidebar: [
        {
          label: "Getting started",
          translations: { es: "Empezar" },
          items: [
            {
              label: "Installation",
              translations: { es: "Instalación" },
              slug: "getting-started/installation",
            },
          ],
        },
        {
          label: "Guides",
          translations: { es: "Guías" },
          items: [
            {
              label: "Resources",
              translations: { es: "Recursos" },
              slug: "guides/resources",
            },
            {
              label: "Policies and security",
              translations: { es: "Políticas y seguridad" },
              slug: "guides/policies",
            },
            {
              label: "Authentication",
              translations: { es: "Autenticación" },
              slug: "guides/authentication",
            },
            {
              label: "Customization",
              translations: { es: "Personalización" },
              slug: "guides/customization",
            },
          ],
        },
        {
          label: "Reference",
          translations: { es: "Referencia" },
          items: [
            {
              label: "CLI",
              translations: { es: "CLI" },
              slug: "reference/cli",
            },
            {
              label: "Templates",
              translations: { es: "Plantillas" },
              slug: "reference/templates",
            },
          ],
        },
        {
          label: "Troubleshooting",
          translations: { es: "Solución de problemas" },
          slug: "troubleshooting",
        },
      ],
    }),
    sitemap(),
  ],
});
