"use client";

import { cn } from "@/lib/utils";

interface StatusTab {
  id: string;
  label: string;
  count: number;
}

interface StatusTabsProps {
  tabs: StatusTab[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}

export function StatusTabs({
  tabs,
  activeId,
  onChange,
  ariaLabel,
  className,
}: StatusTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex items-stretch gap-0",
        "border-b border-border",
        "bg-card",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            data-state={isActive ? "active" : "inactive"}
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex items-center gap-2",
              "px-3.5 py-2.5",
              "bg-transparent border-0 border-b-2 border-transparent",
              "-mb-px", // overlap parent border so active underline replaces it
              "text-[13.5px] font-medium text-muted-foreground",
              "cursor-pointer",
              "transition-colors duration-100 ease-out",
              "hover:text-foreground",
              "focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-[-2px] focus-visible:rounded-sm",
              isActive && "text-brand-darker font-semibold border-b-brand",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "inline-flex items-center justify-center",
                "min-w-[22px] h-[18px] px-1.5",
                "rounded-full",
                "text-[11px] font-semibold tabular-nums",
                "transition-colors duration-100 ease-out",
                isActive
                  ? "bg-brand-muted text-brand-darker"
                  : "bg-neutral-100 text-muted-foreground",
              )}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
