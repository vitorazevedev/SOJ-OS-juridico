import { ReactNode } from "react";

import { cn } from "./utils";

export function SojCard({
  children,
  className,
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card", padding && "p-5", className)}>
      {children}
    </div>
  );
}
