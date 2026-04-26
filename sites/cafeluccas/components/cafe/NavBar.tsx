import Link from "next/link";

const LINKS = [
  { href: "/", label: "Forside" },
  { href: "/#about", label: "Om os" },
  { href: "/menu", label: "Menu" },
  { href: "tel:+4557834466", label: "Bestil" },
  { href: "/#contact", label: "Kontakt" },
] as const;

export function NavBar() {
  return (
    <nav>
      <Link href="/" className="logo logo-link">
        Café Luccas
      </Link>
      <div className="nav-links">
        {LINKS.map(({ href, label }) =>
          href.startsWith("tel:") ? (
            <a key={href} href={href}>
              {label}
            </a>
          ) : (
            <Link key={href} href={href}>
              {label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
