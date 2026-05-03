"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, Minus } from "lucide-react";

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  value?: string;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function Checkbox({
  checked: controlledChecked,
  defaultChecked = false,
  indeterminate = false,
  onCheckedChange,
  disabled = false,
  required,
  id,
  name,
  value,
  className,
  ...rest
}: CheckboxProps) {
  const isControlled = controlledChecked !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const checked = isControlled ? controlledChecked : internalChecked;

  // aria-checked: false → unchecked, true → checked, "mixed" → indeterminate
  const ariaChecked: boolean | "mixed" = indeterminate ? "mixed" : checked;

  function handleClick() {
    if (disabled) return;
    // indeterminate → treat next as checked (select-all UX: indeterminate → checked → unchecked)
    const next = indeterminate ? true : !checked;
    if (!isControlled) {
      setInternalChecked(next);
    }
    onCheckedChange?.(next);
  }

  const isActive = checked || indeterminate;

  return (
    <button
      type="button"
      role="checkbox"
      data-slot="checkbox"
      id={id}
      aria-checked={ariaChecked}
      aria-required={required}
      aria-disabled={disabled ? true : undefined}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "relative inline-flex items-center justify-center h-4 w-4 shrink-0",
        "rounded border cursor-pointer p-0.5 -m-0.5",
        "transition-colors duration-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        isActive ? "bg-brand border-brand" : "bg-background border-border",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {indeterminate ? (
        <Minus size={10} strokeWidth={3} className="text-white pointer-events-none" />
      ) : checked ? (
        <Check size={10} strokeWidth={3} className="text-white pointer-events-none" />
      ) : null}
    </button>
  );
}
