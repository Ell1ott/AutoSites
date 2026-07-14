"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MAIN_NAV, SITE } from "@/lib/site-config";

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 border-b border-primary/20 backdrop-blur-sm transition-all duration-500 ${
        scrolled ? "h-20 bg-surface/95 shadow-2xl" : "h-24 bg-surface/90"
      }`}
    >
      <nav className="mx-auto flex h-full max-w-container-max items-center justify-between px-margin-mobile md:px-margin-desktop">
        <Link
          href="/"
          className="font-headline-md text-headline-md font-semibold tracking-widest text-primary uppercase"
        >
          {SITE.name}
        </Link>

        <div className="hidden items-center space-x-8 lg:space-x-10 xl:space-x-12 md:flex">
          {MAIN_NAV.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`font-label-caps text-label-caps transition-colors duration-300 ${
                  active
                    ? "border-b-2 border-primary pb-1 font-bold text-primary"
                    : "text-on-surface hover:text-primary"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <a
            href={SITE.phoneHref}
            className="hidden bg-primary px-8 py-3 font-label-caps text-label-caps tracking-widest text-on-primary uppercase transition-all duration-300 hover:bg-primary-fixed-dim active:scale-[0.99] sm:inline-block"
          >
            Ring til os
          </a>

          <button
            type="button"
            className="flex items-center justify-center border border-primary/30 p-3 text-primary md:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Luk menu" : "Åbn menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="material-symbols-outlined">{menuOpen ? "close" : "menu"}</span>
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div className="border-t border-primary/20 bg-surface/95 px-margin-mobile py-6 md:hidden">
          <div className="flex flex-col gap-4">
            {MAIN_NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="font-label-caps text-label-caps tracking-widest text-on-surface uppercase hover:text-primary"
              >
                {label}
              </Link>
            ))}
            <a
              href={SITE.phoneHref}
              className="bg-primary px-8 py-3 text-center font-label-caps text-label-caps tracking-widest text-on-primary uppercase"
            >
              Ring til os
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
