"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { LinkButton } from "@/components/ui/link-button";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/register", label: "Register" },
  { href: "/sponsorships", label: "Sponsorships" },
  { href: "/gallery", label: "Gallery" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-border/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/logo.png"
            alt="Craven Cancer Classic"
            width={40}
            height={40}
            className="transition-transform group-hover:scale-105"
          />
          <div className="hidden sm:block">
            <span className="font-display text-lg font-semibold tracking-tight text-foreground">
              Craven Cancer Classic
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-0.5 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative px-3 py-2 text-[13px] font-medium uppercase tracking-wider text-foreground/60 transition-colors hover:text-foreground after:absolute after:bottom-0 after:left-3 after:right-3 after:h-px after:scale-x-0 after:bg-primary after:transition-transform hover:after:scale-x-100"
            >
              {link.label}
            </Link>
          ))}
          <LinkButton
            href="/donate"
            size="sm"
            className="ml-3 rounded-none bg-primary px-5 text-[13px] uppercase tracking-wider text-primary-foreground hover:bg-secondary"
          >
            Donate
          </LinkButton>
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden p-1"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <X className="h-5 w-5 text-foreground/70" />
          ) : (
            <Menu className="h-5 w-5 text-foreground/70" />
          )}
        </button>
      </nav>

      {/* Thin accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="bg-white px-4 pb-6 pt-2 lg:hidden border-b border-border/40">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block py-2.5 text-[13px] font-medium uppercase tracking-wider text-foreground/60 transition-colors hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <LinkButton
            href="/donate"
            size="sm"
            className="mt-3 w-full rounded-none bg-primary text-[13px] uppercase tracking-wider text-primary-foreground hover:bg-secondary"
          >
            Donate
          </LinkButton>
        </div>
      )}
    </header>
  );
}
