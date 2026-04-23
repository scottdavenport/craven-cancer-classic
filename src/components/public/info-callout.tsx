import React from "react";
import { cn } from "@/lib/utils";

export interface InfoCalloutProps {
  children: React.ReactNode;
  className?: string;
}

export function InfoCallout({ children, className }: InfoCalloutProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-neutral-50 p-5 shadow-xs",
        className
      )}
    >
      {children}
    </div>
  );
}
