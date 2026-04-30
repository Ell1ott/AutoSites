"use client";

import { useEffect, useState } from "react";

const navLinks = [
  { href: "#sortiment", label: "Sortiment" },
  { href: "#om-os", label: "Om os" },
  { href: "#service", label: "For dig" },
  { href: "#bestil", label: "Bestil" },
  { href: "#butikken", label: "Kontakt" },
] as const;

export function SiteHeaderNav() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className="nav-float">
      <div className="mobile-top-nav-row">
        <a href="#top" className="brand-box">
          <div className="brand-logo">
            Bachs
            <br />
            Bageri
          </div>
          <div className="brand-tagline">Traditioner siden 1932</div>
        </a>

        <button
          type="button"
          className="mobile-nav-toggle"
          aria-expanded={isOpen}
          aria-controls="bachs-mobile-menu"
          aria-label={isOpen ? "Luk menu" : "Åbn menu"}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="mobile-nav-toggle-line" />
          <span className="mobile-nav-toggle-line" />
          <span className="mobile-nav-toggle-line" />
        </button>
      </div>

      <button
        type="button"
        className={`mobile-nav-backdrop ${isOpen ? "is-open" : ""}`}
        onClick={closeMenu}
        aria-hidden={!isOpen}
        tabIndex={isOpen ? 0 : -1}
      />

      <nav
        className={`bachs-nav ${isOpen ? "is-open" : ""}`}
        aria-label="Hovedmenu"
        id="bachs-mobile-menu"
      >
        <div className="mobile-nav-panel-head">
          <span className="mobile-nav-panel-label">Navigation</span>
          <button
            type="button"
            className="mobile-nav-close"
            onClick={closeMenu}
            aria-label="Luk menu"
          >
            Luk
          </button>
        </div>
        <ul>
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <a href={href} onClick={closeMenu}>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
