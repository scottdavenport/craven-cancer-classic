"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
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

  function handleClick() {
    if (disabled) return;
    const next = !checked;
    if (!isControlled) {
      setInternalChecked(next);
    }
    onCheckedChange?.(next);
  }

  return (
    <button
      type="button"
      role="checkbox"
      data-slot="checkbox"
      id={id}
      aria-checked={checked}
      aria-required={required}
      aria-disabled={disabled ? true : undefined}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "h-4 w-4 cursor-pointer rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    />
  );
}
