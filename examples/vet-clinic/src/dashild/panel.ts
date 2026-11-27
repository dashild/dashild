import { definePanel } from "@dashild/core";

import { signOut } from "../lib/auth-actions";
import { getCurrentUser } from "../lib/session";

import { appointmentResource } from "./resources/appointment";
import { ownerResource } from "./resources/owner";
import { petResource } from "./resources/pet";
import { staffResource } from "./resources/staff";
import { vaccinationResource } from "./resources/vaccination";
import { visitResource } from "./resources/visit";

/**
 * Panel configuration.
 *
 * Better Auth is wired in lib/auth.ts. The organization switcher and the
 * tenant-aware session come from `dashild init --tenancy`.
 */
export const panel = definePanel({
  title: "Vet Clinic",
  path: "/admin",
  locale: "en",
  brand: { name: "Vet Clinic" },
  theme: { defaultMode: "system", toggle: true, primary: "emerald" },
  resources: [
    appointmentResource,
    ownerResource,
    petResource,
    visitResource,
    vaccinationResource,
    staffResource,
  ],
  auth: {
    getCurrentUser,
    signOut,
  },
});
