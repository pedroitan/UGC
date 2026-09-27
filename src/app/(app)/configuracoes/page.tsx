import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrCreateWorkspace, listSocialAccounts } from "@/lib/db";
import { m } from "@/lib/messages";

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const workspace = await getOrCreateWorkspace();
  if (!workspace) redirect("/login");

  const accounts = await listSocialAccounts(workspace.id);
  const connected = params.connected === "instagram";

  return (
    <div className="flex max-w-3xl flex-col gap-6 px-11 py-9">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-heading text-[40px] font-semibold tracking-tight">
          {m.settings.title}
        </h1>
      </header>

      {connected && (
        <p role="status" className="rounded-lg bg-reel-bg px-4 py-3 text-sm font-semibold text-reel-fg">
          {m.settings.accountConnected}
        </p>
      )}
      {params.error && (
        <p role="alert" className="rounded-lg bg-carousel-bg px-4 py-3 text-sm font-semibold text-carousel-fg">
          {m.settings.accountError} ({params.error})
        </p>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-heading text-xl">
            {m.settings.connectedAccounts}
          </CardTitle>
          <Button
            render={<a href="/api/auth/meta">{m.settings.connectInstagram}</a>}
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {accounts.length === 0 && (
            <p className="text-sm text-muted-foreground">{m.settings.noAccounts}</p>
          )}
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{account.handle ?? account.external_id}</span>
                <Badge variant="secondary">{account.channel}</Badge>
              </div>
              <span className="text-muted-foreground">
                {m.settings.expiresAt}{" "}
                {account.token_expires_at
                  ? new Date(account.token_expires_at).toLocaleDateString("pt-BR")
                  : "—"}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <span className="text-sm text-muted-foreground">{m.nav.signOut}</span>
          <form action="/auth/signout" method="post">
            <Button variant="outline" type="submit">
              {m.nav.signOut}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
