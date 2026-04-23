// STUB — Bolt implements in GREEN phase (Issue #233)
// This file exists so RED tests can import the component path.
// All tests against this file are expected to FAIL until Bolt ships the real implementation.
// Real implementation wraps @base-ui/react/checkbox — match the Switch/Select wrapping pattern.

"use client";

import React from "react";

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

// Stub: basic input — RED tests will fail on base-ui wrapper, aria-checked, focus-ring assertions.
export function Checkbox({ checked, defaultChecked, onCheckedChange, disabled, id, name, value, className, ...rest }: CheckboxProps) {
  return (
    <input
      data-slot="checkbox"
      type="checkbox"
      id={id}
      name={name}
      value={value}
      checked={checked}
      defaultChecked={defaultChecked}
      disabled={disabled}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={className}
      {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
    />
  );
}
