import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { getOrCreateWorkspace, listSocialAccounts } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const workspace = await getOrCreateWorkspace();
  if (!workspace) redirect("/login");

  const accounts = await listSocialAccounts(workspace.id);
  const instagram = accounts.find((a) => a.channel === "instagram");

  return (
    <div className="flex min-h-screen">
      <AppSidebar workspaceName={workspace.name} handle={instagram?.handle ?? null} />
      <main className="min-w-0 grow">{children}</main>
    </div>
  );
}
