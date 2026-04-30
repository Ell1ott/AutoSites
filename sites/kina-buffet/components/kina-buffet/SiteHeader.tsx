"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoBlock } from "./LogoBlock";

const NAV = [
  { href: "/menu", label: "Menukort", scrollId: null as string | null },
  { href: "/om-os", label: "Om os", scrollId: null },
  { href: "/#oplevelse", label: "Oplevelsen", scrollId: "oplevelse" },
  { href: "/#catering", label: "Catering", scrollId: "catering" },
  { href: "/#takeaway", label: "Takeaway", scrollId: "takeaway" },
  { href: "/#reserve", label: "Bestil bord", scrollId: "reserve", accent: true },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header>
      <Link href="/" prefetch={false} style={{ textDecoration: "none", color: "inherit" }}>
        <LogoBlock main="Kina Buffet" sub="Byens største kinesiske restaurant • Ikast" />
      </Link>
      <nav aria-label="Hovednavigation">
        {NAV.map(({ href, label, scrollId, ...rest }) => {
          const accent = "accent" in rest && rest.accent;
          return (
            <Link
              key={href + label}
              href={href}
              prefetch={false}
              scroll={false}
              onClick={(e) => {
                if (!scrollId || pathname !== "/") return;
                e.preventDefault();
                document.getElementById(scrollId)?.scrollIntoView({ behavior: "smooth" });
                window.history.replaceState(null, "", `#${scrollId}`);
              }}
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
          );
        })}
      </nav>
    </header>
  );
}
