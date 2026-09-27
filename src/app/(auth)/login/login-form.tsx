"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { m } from "@/lib/messages";
import { signInWithGoogle, signInWithPassword, signUpWithPassword } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInWithPassword, null);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{m.auth.email}</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{m.auth.password}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
          />
        </div>
        {state?.error && (
          <p role="alert" className="text-sm font-medium text-accent-strong">
            {state.error}
          </p>
        )}
        {state?.message && (
          <p role="status" className="text-sm font-medium text-reel-fg">
            {state.message}
          </p>
        )}
        <Button type="submit" className="h-11" disabled={pending}>
          {m.auth.signIn}
        </Button>
        <SignUpButton />
      </form>
      <Separator />
      <form action={signInWithGoogle}>
        <Button type="submit" variant="outline" className="h-11 w-full">
          {m.auth.continueWithGoogle}
        </Button>
      </form>
    </div>
  );
}

function SignUpButton() {
  const [state, formAction, pending] = useActionState(signUpWithPassword, null);
  return (
    <Button formAction={formAction} variant="outline" className="h-11" disabled={pending}>
      {state?.error ?? state?.message ?? m.auth.signUp}
    </Button>
  );
}
