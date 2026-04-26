"use client";

import { useEffect, useState, type ReactNode } from "react";

type MobileNavProps = {
  children: ReactNode;
};

export function MobileNav({ children }: MobileNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 769px)");
    const onChange = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <button
        type="button"
        className="kaffe-nav-toggle"
        aria-expanded={menuOpen}
        aria-controls="primary-nav"
        onClick={() => setMenuOpen((o) => !o)}
      >
        <span className="kaffe-nav-toggle-label">Menu</span>
        <span className="kaffe-nav-toggle-bars" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </button>
      <nav
        id="primary-nav"
        className={`kaffe-nav${menuOpen ? " kaffe-nav--open" : ""}`}
        aria-label="Primary"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a, [href]")) {
            setMenuOpen(false);
          }
        }}
      >
        {children}
      </nav>
    </>
  );
}
