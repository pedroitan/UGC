"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { m } from "@/lib/messages";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export type AuthFormState = { error?: string; message?: string } | null;

/** Único action do form: o botão clicado define a intenção (name="intent"). */
export async function authAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  return formData.get("intent") === "signup"
    ? signUpWithPassword(_prev, formData)
    : signInWithPassword(_prev, formData);
}

export async function signInWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: m.auth.genericError };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: m.auth.genericError };

  redirect("/");
}

export async function signUpWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: m.auth.genericError };

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: m.auth.genericError };

  return { message: m.auth.checkEmail };
}

export async function signInWithGoogle() {
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}
