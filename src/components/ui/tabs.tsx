// STUB — Bolt implements in GREEN phase (Issue #233)
// This file exists so RED tests can import the component path.
// All tests against this file are expected to FAIL until Bolt ships the real base-ui implementation.
// Real implementation wraps @base-ui/react/tabs — match the Switch/Select wrapping pattern.

"use client";

import React, { useState, createContext, useContext } from "react";

interface TabsContextValue {
  value: string;
  onValueChange: (v: string) => void;
}

const TabsContext = createContext<TabsContextValue>({ value: "", onValueChange: () => {} });

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

// Stub: minimal uncontrolled Tabs — RED tests will fail on keyboard nav and aria-selected assertions.
export function Tabs({ defaultValue = "", value: controlledValue, onValueChange, children, className }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue ?? internalValue;
  const handleChange = (v: string) => {
    setInternalValue(v);
    onValueChange?.(v);
  };
  return (
    <TabsContext.Provider value={{ value, onValueChange: handleChange }}>
      <div data-slot="tabs" className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div data-slot="tabs-list" role="tablist" className={className}>
      {children}
    </div>
  );
}

export interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  count?: number;
  className?: string;
}

export function TabsTrigger({ value, children, count, className }: TabsTriggerProps) {
  const ctx = useContext(TabsContext);
  const isSelected = ctx.value === value;
  return (
    <button
      data-slot="tabs-trigger"
      type="button"
      role="tab"
      aria-selected={isSelected}
      onClick={() => ctx.onValueChange(value)}
      className={className}
    >
      {children}
      {count !== undefined && (
        <span
          data-slot="tabs-count"
          aria-hidden="true"
          className={
            isSelected
              ? "ml-1.5 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[0.625rem] font-semibold tabular-nums text-primary"
              : "ml-1.5 inline-flex items-center rounded-full bg-neutral-100 px-1.5 py-0.5 text-[0.625rem] font-semibold tabular-nums text-muted-foreground"
          }
        >
          {count}
        </span>
      )}
    </button>
  );
}

export interface TabsPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsPanel({ value, children, className }: TabsPanelProps) {
  const ctx = useContext(TabsContext);
  if (ctx.value !== value) return null;
  return (
    <div data-slot="tabs-panel" role="tabpanel" className={className}>
      {children}
    </div>
  );
}
