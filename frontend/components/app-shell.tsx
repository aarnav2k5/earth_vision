import Link from "next/link";
import { BarChart3, Bot, Home, Map, Satellite } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/map-view", label: "Map View", icon: Map },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/satellite", label: "Satellite", icon: Satellite },
  { href: "/ai-chat", label: "AI Chat", icon: Bot },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background bg-hero-grid text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 rounded-[32px] border border-white/60 bg-white/60 px-6 py-5 shadow-soft backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge className="mb-3">Garuda Lens</Badge>
            <h1 className="text-3xl font-semibold tracking-tight">Satellite land-use intelligence for real-world decisions.</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Compare Sentinel-2 imagery across time, detect vegetation, urban, and water change, then surface locally grounded planning insights.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
