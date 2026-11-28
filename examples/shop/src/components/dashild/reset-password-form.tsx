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

import { authClient } from "../../lib/auth-client";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    if (result.error) {
      setError(result.error.message ?? "Could not reset the password.");
      setPending(false);
      return;
    }

    router.push("/login");
    router.refresh();
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          This link is invalid or expired.
        </p>
        <Link
          className="text-sm underline underline-offset-4"
          href="/forgot-password"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <FieldDescription>At least 8 characters.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
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
            {pending ? "Saving…" : "Set new password"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
