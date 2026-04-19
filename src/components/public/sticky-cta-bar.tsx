"use client";

import { LinkButton } from "@/components/ui/link-button";

export function StickyCTABar() {
  return (
    <div className="fixed bottom-0 inset-x-0 sm:hidden z-30 bg-background border-t border-border/60 px-4 py-3">
      <div className="flex gap-3 items-center">
        <LinkButton
          href="/register"
          variant="default"
          className="flex-1 h-11 text-[0.8125rem] uppercase tracking-wider"
        >
          Register
        </LinkButton>
        <LinkButton
          href="/donate"
          variant="purple"
          className="flex-1 h-11 text-[0.8125rem] uppercase tracking-wider"
        >
          Donate
        </LinkButton>
      </div>
    </div>
  );
}
