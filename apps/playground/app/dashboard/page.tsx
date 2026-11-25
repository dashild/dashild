import { redirect } from "next/navigation";

import { Button } from "@dashild/admin/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashild/admin/ui/card";
import { signOut } from "@/lib/auth-actions";
import { getCurrentUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login?next=/dashboard");

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Ruta protegida por el proxy
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Si estás viendo esto, la sesión de Better Auth funciona y el proxy de la
        app sigue en su sitio.
      </p>

      <Card className="mt-8 max-w-lg">
        <CardHeader>
          <CardTitle>{user.name}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
          <p>
            Organización:{" "}
            <code className="text-foreground">
              {user.organizationId ?? "sin asignar"}
            </code>
          </p>
          <p>
            Roles: <code className="text-foreground">{user.roles.join(", ")}</code>
          </p>
          <form action={signOut} className="pt-4">
            <Button type="submit" variant="outline" size="sm">
              Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
