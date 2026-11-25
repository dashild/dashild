import { AuthSplit } from "@/components/dashild/auth-split";
import { SignupForm } from "@/components/dashild/signup-form";
import { DEFAULT_THEME_MODE, getThemeMode } from "@/lib/theme";
import { panel } from "@/src/dashild/panel";

export default async function SignupPage() {
  const mode = await getThemeMode(panel.theme?.defaultMode ?? DEFAULT_THEME_MODE);

  return (
    <AuthSplit
      brandName={panel.brand?.name ?? panel.title}
      panelTitle={panel.title}
      quote="Tus datos, tus reglas. El panel solo pone los guardarraíles: validación, DTO y aislamiento en el servidor."
      mode={mode}
      primary={panel.theme?.primary}
    >
      <SignupForm />
    </AuthSplit>
  );
}
