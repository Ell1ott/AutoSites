import Link from "next/link";
import { FOOTER_NAV, LINKS, SITE } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="bg-white py-16 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-12">
          <div className="text-center md:text-left space-y-4">
            <h4 className="font-bold uppercase tracking-widest text-sm mb-4">
              Kontakt
            </h4>
            <p className="text-sm text-gray-500">
              <a
                href={SITE.phoneHref}
                className="text-gray-500 no-underline hover:text-brand-red transition"
              >
                📞 {SITE.phone}
              </a>
            </p>
            <p className="text-sm text-gray-500">📍 {SITE.address}</p>
            <p className="text-sm text-gray-500">
              <a
                href={LINKS.wolt}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 no-underline hover:text-brand-red transition"
              >
                Bestil på Wolt →
              </a>
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="text-brand-dark">
                <p className="text-2xl font-serif font-bold tracking-widest leading-none uppercase">
                  Wok og
                </p>
                <p className="text-xs tracking-[0.2em] uppercase">Chopsticks</p>
              </div>
            </div>
            <div className="flex justify-center gap-6 text-gray-400 text-sm">
              <a
                href={LINKS.maps}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand-red no-underline"
              >
                Kort
              </a>
              <a
                href={LINKS.rejseplanen}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand-red no-underline"
              >
                Rejseplanen
              </a>
              <a
                href={LINKS.findsmiley}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand-red no-underline"
              >
                Smiley
              </a>
            </div>
          </div>
          <div className="text-center md:text-right space-y-2">
            <ul className="text-sm text-gray-600 space-y-2 uppercase tracking-wide list-none m-0 p-0">
              {FOOTER_NAV.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    className="hover:text-brand-red no-underline"
                    href={href}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-gray-100 text-center text-[10px] text-gray-400 uppercase tracking-widest">
          Copyright {new Date().getFullYear()} © {SITE.name} · {SITE.cityLine}
        </div>
      </div>
    </footer>
  );
}
