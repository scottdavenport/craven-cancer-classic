import React from "react";
import { cn } from "@/lib/utils";

export type EyebrowTone = "light" | "primary" | "brand";

export interface SectionEyebrowProps {
  tone?: EyebrowTone;
  className?: string;
  children: React.ReactNode;
}

const TONE_CLASS: Record<EyebrowTone, string> = {
  light: "text-brand-light",
  primary: "text-primary",
  brand: "text-brand",
};

export function SectionEyebrow({
  tone = "primary",
  className,
  children,
}: SectionEyebrowProps) {
  return (
    <p
      className={cn(
        "font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] mb-3",
        TONE_CLASS[tone],
        className
      )}
    >
      {children}
    </p>
  );
}
