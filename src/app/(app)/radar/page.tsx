import { redirect } from "next/navigation";
import { getOrCreateWorkspace, listKeywords, listPautas, listSources } from "@/lib/db";
import { RadarClient } from "./radar-client";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const workspace = await getOrCreateWorkspace();
  if (!workspace) redirect("/login");

  const [keywords, sources, pautas] = await Promise.all([
    listKeywords(workspace.id),
    listSources(workspace.id),
    listPautas(workspace.id, "new"),
  ]);

  return <RadarClient keywords={keywords} sources={sources} pautas={pautas} />;
}
