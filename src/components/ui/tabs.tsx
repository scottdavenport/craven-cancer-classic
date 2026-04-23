"use client";

import React, {
  useState,
  createContext,
  useContext,
  useRef,
  useCallback,
} from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (v: string) => void;
  registerTrigger: (value: string, el: HTMLButtonElement | null) => void;
  getTriggers: () => { value: string; el: HTMLButtonElement }[];
}

const TabsContext = createContext<TabsContextValue>({
  value: "",
  onValueChange: () => {},
  registerTrigger: () => {},
  getTriggers: () => [],
});

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  defaultValue = "",
  value: controlledValue,
  onValueChange,
  children,
  className,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue ?? internalValue;

  // Registry: ordered list of { value, el } for keyboard navigation
  const triggersRef = useRef<{ value: string; el: HTMLButtonElement }[]>([]);

  const registerTrigger = useCallback(
    (triggerValue: string, el: HTMLButtonElement | null) => {
      const existing = triggersRef.current.findIndex(
        (t) => t.value === triggerValue
      );
      if (el) {
        if (existing === -1) {
          triggersRef.current.push({ value: triggerValue, el });
        } else {
          triggersRef.current[existing].el = el;
        }
      } else {
        if (existing !== -1) {
          triggersRef.current.splice(existing, 1);
        }
      }
    },
    []
  );

  const getTriggers = useCallback(
    () => triggersRef.current.filter((t) => !!t.el),
    []
  );

  const handleChange = (v: string) => {
    setInternalValue(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider
      value={{ value, onValueChange: handleChange, registerTrigger, getTriggers }}
    >
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

export function TabsTrigger({
  value,
  children,
  count,
  className,
}: TabsTriggerProps) {
  const ctx = useContext(TabsContext);
  const isSelected = ctx.value === value;

  const refCallback = useCallback(
    (el: HTMLButtonElement | null) => {
      ctx.registerTrigger(value, el);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const triggers = ctx.getTriggers();
    const currentIndex = triggers.findIndex((t) => t.value === value);
    if (currentIndex === -1) return;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % triggers.length;
      triggers[nextIndex].el.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIndex =
        (currentIndex - 1 + triggers.length) % triggers.length;
      triggers[prevIndex].el.focus();
    }
  }

  return (
    <button
      ref={refCallback}
      data-slot="tabs-trigger"
      type="button"
      role="tab"
      aria-selected={isSelected}
      onClick={() => ctx.onValueChange(value)}
      onKeyDown={handleKeyDown}
      className={cn(className)}
    >
      {children}
      {count !== undefined && (
        <span
          data-slot="tabs-count"
          aria-hidden="true"
          className={
            isSelected
              ? "ml-1.5 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-primary"
              : "ml-1.5 inline-flex items-center rounded-full bg-neutral-100 px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-muted-foreground"
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
