import { AuthSplit } from "@/components/dashild/auth-split";
import { LoginForm } from "@/components/dashild/login-form";
import { DEFAULT_THEME_MODE, getThemeMode } from "@/lib/theme";
import { panel } from "@/src/dashild/panel";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const mode = await getThemeMode(panel.theme?.defaultMode ?? DEFAULT_THEME_MODE);

  return (
    <AuthSplit
      brandName={panel.brand?.name ?? panel.title}
      panelTitle={panel.title}
      quote="El panel que no tienes que construir dos veces. Un recurso, un archivo, y las reglas de seguridad en el servidor."
      mode={mode}
      primary={panel.theme?.primary}
    >
      <LoginForm next={next} />
    </AuthSplit>
  );
}
