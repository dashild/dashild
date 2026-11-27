import type { LoadedTemplate } from "../types.js";

import { demoTemplate } from "./demo.js";
import { saasTemplate } from "./saas.js";

export const BUNDLED_TEMPLATES: Record<string, LoadedTemplate> = {
  demo: demoTemplate,
  saas: saasTemplate,
};

export const BUNDLED_TEMPLATE_NAMES = ["basic", "demo", "saas"] as const;
