import type { LoadedTemplate } from "../types.js";

import { blogTemplate } from "./blog.js";
import { demoTemplate } from "./demo.js";
import { saasTemplate } from "./saas.js";

export const BUNDLED_TEMPLATES: Record<string, LoadedTemplate> = {
  blog: blogTemplate,
  demo: demoTemplate,
  saas: saasTemplate,
};

export const BUNDLED_TEMPLATE_NAMES = ["basic", "blog", "demo", "saas"] as const;
