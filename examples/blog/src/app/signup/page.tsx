import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashild/admin/ui/card";

import { SignupForm } from "../../components/dashild/signup-form";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  const disabled = process.env.ALLOW_SIGNUP === "false";

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {disabled ? "Sign-up disabled" : "Create account"}
          </CardTitle>
          <CardDescription>
            {disabled
              ? "Ask an administrator for an invitation."
              : "Create your account. An administrator can grant access later."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {disabled ? (
            <p className="text-sm text-muted-foreground">
              Already have an account? <Link href="/login">Sign in</Link>
            </p>
          ) : (
            <SignupForm />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
