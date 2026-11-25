"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@dashild/admin/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@dashild/admin/ui/field";
import { Input } from "@dashild/admin/ui/input";
import { Spinner } from "@dashild/admin/ui/spinner";
import { authClient } from "@/lib/auth-client";

interface LoginFormProps {
  next?: string;
}

export function LoginForm({ next }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    });

    if (result.error) {
      setError(result.error.message ?? "No se pudo iniciar sesión.");
      setPending(false);
      return;
    }

    const target =
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
    router.push(target);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Entra en tu cuenta
          </h1>
          <p className="text-sm text-muted-foreground">
            Usa el email y la contraseña de tu cuenta.
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="ana@acme.test"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Contraseña</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Field>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Entrando…" : "Entrar"}
          </Button>
          <FieldDescription className="text-center">
            ¿No tienes cuenta?{" "}
            <Link
              href="/signup"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Crear una
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
