import { redirect } from "next/navigation";
import { getBrandKit, getOrCreateWorkspace } from "@/lib/db";
import { m } from "@/lib/messages";
import { BrandKitForm } from "./brand-kit-form";

export default async function BrandKitPage() {
  const workspace = await getOrCreateWorkspace();
  if (!workspace) redirect("/login");

  const brandKit = await getBrandKit(workspace.id);

  return (
    <div className="flex flex-col gap-6 px-11 py-9">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-heading text-[40px] font-semibold tracking-tight">
          {m.brandKit.title}
        </h1>
        <p className="text-sm text-muted-foreground">{m.brandKit.subtitle}</p>
      </header>
      <BrandKitForm workspaceId={workspace.id} initial={brandKit} />
    </div>
  );
}
