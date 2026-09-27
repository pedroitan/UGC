import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { getCurrentUser } from "@/lib/db";
import { isDevBypass } from "@/lib/dev-auth";
import { m } from "@/lib/messages";

export default async function LoginPage() {
  if (isDevBypass()) redirect("/");
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-accent-brand font-heading text-xl font-bold text-ink">
            P
          </div>
          <span className="font-heading text-2xl font-semibold">{m.app.name}</span>
        </div>
        <h1 className="font-heading text-2xl font-semibold">{m.auth.loginTitle}</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">{m.auth.loginSubtitle}</p>
        <LoginForm />
      </div>
    </div>
  );
}
