import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
