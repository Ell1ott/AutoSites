import Link from "next/link";
import { LINKS, SITE } from "@/lib/site-config";

export function TopInfoBar() {
  return (
    <div className="bg-brand-dark text-white text-xs py-2 px-6 flex justify-between items-center border-b border-gray-800">
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <span className="flex items-center gap-2">
          <span className="opacity-70" aria-hidden>
            📍
          </span>
          {SITE.address}
        </span>
        <a
          href={SITE.phoneHref}
          className="flex items-center gap-2 text-white no-underline hover:text-brand-gold transition"
        >
          <span className="opacity-70" aria-hidden>
            📞
          </span>
          {SITE.phone}
        </a>
      </div>
      <div className="hidden sm:flex space-x-4 opacity-80">
        <a
          href={LINKS.wolt}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white no-underline hover:text-brand-gold transition"
        >
          Wolt
        </a>
        <a
          href={LINKS.maps}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white no-underline hover:text-brand-gold transition"
        >
          Kort
        </a>
      </div>
    </div>
  );
}
