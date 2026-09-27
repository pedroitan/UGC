import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { getOrCreateWorkspace, listSocialAccounts } from "@/lib/db";
import { isDevBypass } from "@/lib/dev-auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const workspace = await getOrCreateWorkspace();
  if (!workspace) redirect("/login");

  const accounts = await listSocialAccounts(workspace.id);
  const instagram = accounts.find((a) => a.channel === "instagram");

  return (
    <div className="flex min-h-screen">
      <AppSidebar workspaceName={workspace.name} handle={instagram?.handle ?? null} />
      <main className="min-w-0 grow">
        {isDevBypass() && (
          <p className="bg-story-bg px-4 py-2 text-center text-[13px] font-semibold text-story-fg">
            Modo dev (admin) — dados de exemplo, nada é salvo.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
