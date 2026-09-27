import { m } from "@/lib/messages";

export default function RadarPage() {
  return (
    <div className="flex flex-col gap-1.5 px-11 py-9">
      <h1 className="font-heading text-[40px] font-semibold tracking-tight">{m.nav.radar}</h1>
      <p className="text-sm text-muted-foreground">{m.placeholders.radar}</p>
    </div>
  );
}
