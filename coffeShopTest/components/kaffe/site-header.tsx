import Link from "next/link";
import { navLinks, SITE_NAME } from "@/lib/kaffe-content";

export function SiteHeader() {
  return (
    <header className="container kaffe-header">
      <div className="kaffe-logo">{SITE_NAME}</div>
      <nav className="kaffe-nav" aria-label="Primary">
        <ul>
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
