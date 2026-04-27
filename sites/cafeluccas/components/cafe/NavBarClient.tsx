"use client";

import { type ReactNode, useState } from "react";

const PANEL_ID = "cafe-nav-panel";

type NavBarClientProps = {
  brand: ReactNode;
  children: ReactNode;
};

export function NavBarClient({ brand, children }: NavBarClientProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const toggle = () => setOpen((v) => !v);

  return (
    <nav
      className={`cafe-nav${open ? " cafe-nav--open" : ""}`}
      aria-label="Hovedmenu"
    >
      <div className="cafe-nav-bar">
        {brand}
        <button
          type="button"
          className="cafe-nav-burger"
          aria-label="Åbn eller luk menu"
          aria-expanded={open}
          aria-controls={PANEL_ID}
          onClick={toggle}
        >
          <span className="cafe-nav-burger-line" aria-hidden />
          <span className="cafe-nav-burger-line" aria-hidden />
          <span className="cafe-nav-burger-line" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        className="cafe-nav-scrim"
        tabIndex={-1}
        aria-label="Luk menu"
        onClick={close}
      />
      <div
        id={PANEL_ID}
        className="nav-links"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a, button")) {
            close();
          }
        }}
      >
        {children}
      </div>
    </nav>
  );
}
