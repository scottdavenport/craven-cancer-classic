"use client";

import { Search } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface FilterBarProps {
  /** Current search input value */
  searchValue: string;
  /** Called when search input changes */
  onSearchChange: (value: string) => void;
  /** aria-label and placeholder for the search input */
  searchPlaceholder: string;
  /** Whether to render the search input at all (Photos has no search — year filter only) */
  showSearch?: boolean;
  /**
   * Secondary filter dropdowns / toggles.
   * Each child is typically a labeled filter group rendered via the surface's own filter components.
   * Filled by consumer in Phase 2/3.
   */
  children?: React.ReactNode;
  /**
   * Active-filter chips row.
   * Pass <ActiveFilterChips> when filters are active; omit entirely when no filters applied.
   * The chips row is removed from the DOM (not just hidden) when null/undefined.
   */
  chips?: React.ReactNode;
  className?: string;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  showSearch = true,
  children,
  chips,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "p-4 bg-card flex flex-col gap-3.5",
        className,
      )}
    >
      {/* Row 1: search */}
      {showSearch && (
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            strokeWidth={2}
          />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className={cn(
              "w-full h-9 pl-9 pr-3",
              "bg-background border-[1.5px] border-border rounded-lg",
              "text-[13.5px] text-foreground placeholder:text-muted-foreground",
              "outline-none focus:border-brand focus:ring-2 focus:ring-brand/25",
              "transition-colors duration-100 ease-out",
            )}
          />
        </div>
      )}

      {/* Row 2: labeled secondary filters (slot — filled by consumer in Phase 2/3) */}
      {children && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          {children}
        </div>
      )}

      {/* Row 3: active filter chips (removed from DOM when no filters active) */}
      {chips}
    </div>
  );
}
