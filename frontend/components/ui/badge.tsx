import * as React from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-muted",
        className
      )}
      {...props}
    />
  );
}
