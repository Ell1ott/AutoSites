import type { Metadata } from "next";
import { SiteFooter } from "@/components/mikkelborg-kro/site-footer";
import { SiteHeader } from "@/components/mikkelborg-kro/site-header";
import { CtaSection } from "@/components/mikkelborg-kro/cta-section";
import { PageHero } from "@/components/mikkelborg-kro/page-hero";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Kontakt | Mikkelborg Kro",
  description:
    "Kontakt Mikkelborg Kro for bordbestilling, overnatning eller spørgsmål. Ring på tlf. 22 27 74 65.",
};

export default function KontaktPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero eyebrow="Kontakt" title="Kontakt" />

        <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-gutter md:grid-cols-2">
            <div className="space-y-6">
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Ønsker du/I at bestille bord hos os, bestille overnatning, selskab eller har du nogle
              spørgsmål, kan du ringe på tlf. {SITE.phone}.
            </p>
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                Vi glæder os til at byde dig velkommen på Mikkelborg Kro.
              </p>
            </div>

            <div className="space-y-6 border border-primary/10 bg-surface-container p-8">
              <h2 className="font-headline-sm text-headline-sm text-primary">Mikkelborg Kro</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {SITE.address.street}
                <br />
                {SITE.address.postal}
                <br />
                {SITE.address.country}
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                <a href={SITE.phoneHref} className="hover:text-primary">
                  Tlf. {SITE.phone}
                </a>
                <br />
                <a href={`mailto:${SITE.email}`} className="hover:text-primary">
                  {SITE.email}
                </a>
              </p>
            </div>
          </div>
        </section>

        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
