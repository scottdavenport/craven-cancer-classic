import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/40 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold">Craven Cancer Classic</h3>
            <p className="mt-2 text-sm text-primary-foreground/70">
              Remembering those who have lost their battle, supporting those who
              continue their fight.
            </p>
            <p className="mt-4 text-sm text-primary-foreground/70">
              Honoring Scott Davenport Sr., Brian Fisher &amp; John Aylward
            </p>
          </div>

          <div>
            <h4 className="font-semibold">Quick Links</h4>
            <ul className="mt-2 space-y-1">
              {[
                { href: "/register", label: "Register" },
                { href: "/sponsorships", label: "Sponsorships" },
                { href: "/donate", label: "Donate" },
                { href: "/gallery", label: "Gallery" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Contact</h4>
            <ul className="mt-2 space-y-1 text-sm text-primary-foreground/70">
              <li>New Bern Golf &amp; Country Club</li>
              <li>New Bern, NC</li>
              <li className="pt-2">
                <a
                  href="https://www.facebook.com/CravenCancerClassic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-primary-foreground"
                >
                  Facebook
                </a>
                {" | "}
                <a
                  href="https://instagram.com/cravencancerclassic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-primary-foreground"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-primary-foreground/10 pt-8 text-center text-sm text-primary-foreground/50">
          &copy; {new Date().getFullYear()} Craven Cancer Classic. All proceeds
          benefit cancer patients through the Carolina East Health Foundation.
        </div>
      </div>
    </footer>
  );
}
