"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAV } from "@/lib/site-config";

type SiteHeaderProps = {
  /** Home-style absolute white-on-transparent header */
  overlay?: boolean;
};

export function SiteHeader({ overlay = false }: SiteHeaderProps) {
  const pathname = usePathname();

  if (overlay) {
    return (
      <header className="absolute top-10 left-0 w-full z-50 px-4 md:px-10">
        <Nav pathname={pathname} light />
      </header>
    );
  }

  return (
    <header className="relative z-50 w-full bg-white border-b border-gray-100 px-4 md:px-10">
      <Nav pathname={pathname} light={false} />
    </header>
  );
}

function Nav({ pathname, light }: { pathname: string; light: boolean }) {
  return (
    <nav className="max-w-7xl mx-auto flex items-center justify-between py-4 gap-4">
      <Link href="/" className="flex items-center gap-2 no-underline shrink-0">
        <div className="w-12 h-12 bg-brand-red rounded-full flex items-center justify-center text-white font-bold italic">
          WOC
        </div>
        <div className={light ? "text-white" : "text-brand-dark"}>
          <p className="text-xl font-bold tracking-widest leading-none uppercase">
            Wok og
          </p>
          <p className="text-sm tracking-[0.2em] uppercase">Chopsticks</p>
        </div>
      </Link>
      <ul
        className={`hidden xl:flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-medium uppercase tracking-wider list-none m-0 p-0 ${
          light ? "text-white" : "text-brand-dark"
        }`}
      >
        {MAIN_NAV.map(({ href, label }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={
                  active
                    ? "text-brand-red no-underline"
                    : "hover:text-brand-red transition no-underline"
                }
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href="/reservation"
        className={
          light
            ? "bg-transparent border border-white text-white px-4 py-2 text-xs uppercase tracking-widest hover:bg-white hover:text-brand-dark transition no-underline shrink-0"
            : "bg-transparent border border-brand-dark text-brand-dark px-4 py-2 text-xs uppercase tracking-widest hover:bg-brand-dark hover:text-white transition no-underline shrink-0"
        }
      >
        Book bord
      </Link>
    </nav>
  );
}
