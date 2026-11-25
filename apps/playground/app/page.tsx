import Link from "next/link";

import { Button } from "@dashild/admin/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashild/admin/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Aplicación existente
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Acme</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Este proyecto no lo creó Dashild. Tiene su propio layout, su propio
        proxy, su propia autenticación con Better Auth y sus propias rutas.
        Dashild se instala encima y no debe tocar nada de eso.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>
              Ruta protegida por el proxy de la app y por la sesión de Better
              Auth.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Abrir</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Administración</CardTitle>
            <CardDescription>
              El panel de Dashild: sidebar, dashboard vacío y recursos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href="/admin">Abrir</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>
              Login con email y contraseña gestionado por Better Auth.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
