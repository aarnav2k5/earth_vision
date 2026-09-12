"use client";

import Link from "next/link";
import { Activity, BarChart3, Map, Moon, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/map-view", label: "Map View", icon: Map },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/satellite", label: "NDVI", icon: Activity },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") return <>{children}</>;

  return (
    <div className="garuda-frame min-h-screen text-foreground">
      <header className="flex h-[72px] items-center gap-6 border-b border-white/10 bg-black/30 px-6 backdrop-blur-xl">
        <Link href="/" className="flex w-[220px] items-center gap-3 text-sm font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-black"><Sparkles className="h-4 w-4" /></span>
          <span>Earth Vision</span>
        </Link>
        <nav className="flex h-10 flex-1 justify-center gap-1 rounded-full border border-white/10 bg-white/[.03] p-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={cn("flex min-w-[130px] items-center justify-center gap-2 rounded-full px-5 text-xs font-medium text-slate-500 transition hover:text-white", pathname === href && "bg-white text-black")}>
              <Icon className="h-3.5 w-3.5" />{label}
            </Link>
          ))}
        </nav>
        <div className="flex w-[220px] items-center justify-end gap-4 text-xs text-slate-500">
          <span className="hidden items-center gap-2 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-400" /> NDVI data available</span>
          <button type="button" aria-label="Dark theme active" title="Dark theme active" className="rounded-lg p-1 text-slate-500"><Moon className="h-4 w-4" /></button>
        </div>
      </header>
      <main className="min-h-[calc(100vh-72px)]">{children}</main>
    </div>
  );
}
