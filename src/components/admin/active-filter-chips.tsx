"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface FilterChip {
  id: string;
  keyText: string;
  valueText?: string;
  onRemove: () => void;
}

interface ActiveFilterChipsProps {
  chips: FilterChip[];
  onClearAll: () => void;
  className?: string;
}

export function ActiveFilterChips({
  chips,
  onClearAll,
  className,
}: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 flex-wrap",
        "pt-1 border-t border-dashed border-border",
        className,
      )}
    >
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1.5 h-[26px] pl-2.5 pr-1 rounded-full bg-brand-muted text-brand-darker text-[12.5px] font-medium"
        >
          {chip.valueText !== undefined ? (
            <>
              <span className="font-semibold">{chip.keyText}:</span>
              <span className="font-medium">{chip.valueText}</span>
            </>
          ) : (
            <span className="font-semibold">{chip.keyText}</span>
          )}
          <button
            type="button"
            aria-label={`Remove ${chip.keyText} filter`}
            onClick={chip.onRemove}
            className={cn(
              "size-[18px] rounded-full inline-flex items-center justify-center",
              "bg-transparent text-brand-darker",
              "hover:bg-brand-darker/12 transition-colors duration-100 ease-out",
            )}
          >
            <X className="size-2.5" strokeWidth={2.5} />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className={cn(
          "ml-auto bg-transparent border-0 p-0",
          "text-[12.5px] font-semibold text-brand-dark",
          "hover:text-brand-darker hover:underline",
          "cursor-pointer transition-colors duration-100 ease-out",
        )}
      >
        Clear filters
      </button>
    </div>
  );
}
