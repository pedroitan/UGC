"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Palette,
  PenTool,
  Radar,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { m } from "@/lib/messages";

const items = [
  { href: "/", label: m.nav.dashboard, icon: LayoutDashboard },
  { href: "/radar", label: m.nav.radar, icon: Radar },
  { href: "/estudio", label: m.nav.estudio, icon: PenTool },
  { href: "/calendario", label: m.nav.calendario, icon: CalendarDays },
  { href: "/brand-kit", label: m.nav.brandKit, icon: Palette },
] as const;

export function AppSidebar({
  workspaceName,
  handle,
}: {
  workspaceName: string;
  handle: string | null;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="flex w-[232px] shrink-0 flex-col gap-1 bg-ink px-[18px] py-7 text-paper"
    >
      <div className="flex items-center gap-2.5 px-2.5 pb-7">
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-accent-brand font-heading text-xl font-bold text-ink">
          P
        </div>
        <span className="font-heading text-[26px] font-semibold">{m.app.name}</span>
      </div>

      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-[11px] text-[15px] text-[#C9C2B4] transition-colors hover:text-white",
              active && "bg-sidebar-accent font-semibold text-white",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        );
      })}

      <div className="mt-2">
        <Link
          href="/configuracoes"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-[11px] text-[15px] text-[#C9C2B4] transition-colors hover:text-white",
            pathname.startsWith("/configuracoes") && "bg-sidebar-accent font-semibold text-white",
          )}
        >
          <Settings className="h-4 w-4" aria-hidden />
          {m.nav.configuracoes}
        </Link>
      </div>

      <div className="mt-auto flex flex-col gap-1 rounded-[10px] bg-sidebar-accent p-3.5">
        <span className="text-xs text-[#C9C2B4]">{m.nav.activeBrand}</span>
        <span className="truncate text-[15px] font-semibold">{workspaceName}</span>
        <span className="text-[13px] text-[#C9C2B4]">
          {handle ? `${handle} · Instagram` : "Instagram não conectado"}
        </span>
      </div>
    </nav>
  );
}
