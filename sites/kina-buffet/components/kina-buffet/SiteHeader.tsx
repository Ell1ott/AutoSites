"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoBlock } from "./LogoBlock";

const NAV = [
  { id: "menu", label: "The Menu", accent: false },
  { id: "catering", label: "Catering", accent: false },
  { id: "takeaway", label: "Takeaway", accent: false },
  { id: "reserve", label: "Book a Table", accent: true },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  const onNavClick =
    (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (pathname !== "/") return;
      e.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      window.history.replaceState(null, "", `#${id}`);
    };

  return (
    <header>
      <LogoBlock main="Kina Buffet" sub="Est. 1994 • Authentic Asian" />
      <nav aria-label="Primary">
        {NAV.map(({ id, label, accent }) => (
          <Link
            key={id}
            href={`/#${id}`}
            onClick={onNavClick(id)}
            prefetch={false}
            scroll={false}
            style={
              accent
                ? {
                    color: "var(--red)",
                    borderBottom: "2px solid var(--red)",
                  }
                : undefined
            }
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
