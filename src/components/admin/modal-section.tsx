import * as React from "react";

import { cn } from "@/lib/utils";

interface ModalSectionProps {
  /** Banded section header label — string-locked by Aria per surface in Phase 2/3 */
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ModalSection({ title, children, className }: ModalSectionProps) {
  return (
    <div className={cn("pt-4", className)}>
      {/* Section header band */}
      <div className="pb-2 border-b border-border mb-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.10em] text-brand-darker">
          {title}
        </span>
      </div>

      {/* Section body */}
      <div className="pt-3 pb-3 px-0">
        {children}
      </div>
    </div>
  );
}
