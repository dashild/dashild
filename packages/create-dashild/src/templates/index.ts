import type { LoadedTemplate } from "../types.js";

import { demoTemplate } from "./demo.js";

export const BUNDLED_TEMPLATES: Record<string, LoadedTemplate> = {
  demo: demoTemplate,
};

export const BUNDLED_TEMPLATE_NAMES = ["basic", "demo"] as const;
