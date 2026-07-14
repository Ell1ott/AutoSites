import Link from "next/link";
import { EXTERNAL_LINKS, FOOTER_NAV, SITE } from "@/lib/site-config";

const YEAR = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer className="border-t border-primary/20 bg-surface-container-low">
      <div className="mx-auto grid max-w-container-max grid-cols-1 gap-gutter px-margin-mobile py-section-gap md:grid-cols-2 md:px-margin-desktop lg:grid-cols-4">
        <div className="space-y-6">
          <div className="font-headline-sm text-headline-sm uppercase tracking-widest text-primary">
            {SITE.name}
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">{SITE.tagline}</p>
          <div className="flex space-x-4">
            <a
              href={EXTERNAL_LINKS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary transition-transform hover:scale-110"
              aria-label="Mikkelborg Kro på Facebook"
            >
              <span className="material-symbols-outlined">thumb_up</span>
            </a>
            <a
              href={`mailto:${SITE.email}`}
              className="text-primary transition-transform hover:scale-110"
              aria-label="Send email"
            >
              <span className="material-symbols-outlined">alternate_email</span>
            </a>
            <a
              href={SITE.phoneHref}
              className="text-primary transition-transform hover:scale-110"
              aria-label="Ring til os"
            >
              <span className="material-symbols-outlined">call</span>
            </a>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="font-label-caps text-label-caps uppercase text-primary">Hurtige links</h4>
          <ul className="space-y-3 font-body-md text-body-md">
            {FOOTER_NAV.map(({ href, label }) => (
              <li key={href + label}>
                <Link
                  href={href}
                  className="text-on-surface-variant transition-colors hover:text-primary"
                >
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={EXTERNAL_LINKS.smiley}
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-surface-variant transition-colors hover:text-primary"
              >
                Smiley
              </a>
            </li>
            <li>
              <a
                href={EXTERNAL_LINKS.rapport}
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-surface-variant transition-colors hover:text-primary"
              >
                Rapport
              </a>
            </li>
          </ul>
        </div>

        <div className="space-y-6">
          <h4 className="font-label-caps text-label-caps uppercase text-primary">Adresse</h4>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {SITE.address.street}
            <br />
            {SITE.address.postal}
            <br />
            {SITE.address.country}
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant">
            <a href={SITE.phoneHref} className="hover:text-primary">
              {SITE.phone}
            </a>
            <br />
            <a href={`mailto:${SITE.email}`} className="hover:text-primary">
              {SITE.email}
            </a>
          </p>
        </div>

        <div className="space-y-6">
          <h4 className="font-label-caps text-label-caps uppercase text-primary">Kontakt</h4>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Book værelse(r) pr. telefon {SITE.phone}. Vi glæder os til at byde dig velkommen.
          </p>
          <form className="flex gap-2" action={`mailto:${SITE.email}`} method="get">
            <input
              className="w-full border border-primary/20 bg-surface p-3 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="Din email"
              type="email"
              name="subject"
              aria-label="Din email"
            />
            <button
              type="submit"
              className="flex aspect-square items-center justify-center bg-primary p-3 text-on-primary transition-colors hover:bg-primary-fixed-dim"
              aria-label="Send"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-container-max border-t border-primary/10 px-margin-mobile py-8 text-center md:px-margin-desktop">
        <p className="font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
          © {YEAR} {SITE.name}. Alle rettigheder forbeholdes.
        </p>
      </div>
    </footer>
  );
}
