"use client";

import { Pencil, Trash2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface RowActionsProps {
  editLabel: string;
  deleteLabel: string;
  selectLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Slot for surface-specific labeled button (e.g. Teams "Mark paid"). Omit to suppress. */
  surfaceSpecial?: React.ReactNode;
  className?: string;
}

export function RowActions({
  editLabel,
  deleteLabel,
  selectLabel,
  onEdit,
  onDelete,
  checked = false,
  onCheckedChange,
  surfaceSpecial,
  className,
}: RowActionsProps) {
  return (
    <>
      {/* Per-row checkbox — fades in on row hover (opacity driven by parent group) */}
      <input
        type="checkbox"
        aria-label={selectLabel}
        aria-checked={checked}
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className={cn(
          "size-4 rounded-[3px] border-2 border-slate-400",
          "opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100",
          "data-[state=selected]:opacity-100",
          "transition-opacity duration-150 ease-out",
          "cursor-pointer flex-shrink-0",
          "accent-primary",
        )}
      />

      {/* Actions cluster: pencil + trash + surface-special slot */}
      <span
        className={cn(
          "inline-flex items-center gap-1",
          "opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100",
          "transition-opacity duration-150 ease-out",
          "pointer-events-none group-hover/row:pointer-events-auto group-focus-within/row:pointer-events-auto",
          "relative z-10",
          className,
        )}
      >
        <button
          type="button"
          aria-label={editLabel}
          onClick={onEdit}
          className={cn(
            "size-7 rounded-[var(--radius-md)] inline-flex items-center justify-center",
            "text-foreground",
            "hover:bg-muted transition-colors duration-100 ease-out",
          )}
        >
          <Pencil className="size-4" strokeWidth={2} />
        </button>

        <button
          type="button"
          aria-label={deleteLabel}
          onClick={onDelete}
          className={cn(
            "size-7 rounded-[var(--radius-md)] inline-flex items-center justify-center",
            "text-foreground",
            "hover:bg-destructive/10 hover:text-destructive transition-colors duration-100 ease-out",
          )}
        >
          <Trash2 className="size-4" strokeWidth={2} />
        </button>

        {surfaceSpecial && (
          <span className="ml-1">{surfaceSpecial}</span>
        )}
      </span>
    </>
  );
}
