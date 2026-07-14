import type { Metadata } from "next";
import { SiteFooter } from "@/components/mikkelborg-kro/site-footer";
import { SiteHeader } from "@/components/mikkelborg-kro/site-header";
import { CtaSection } from "@/components/mikkelborg-kro/cta-section";
import { PageHero } from "@/components/mikkelborg-kro/page-hero";
import { IMAGES } from "@/lib/images";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Krostue | Mikkelborg Kro",
  description: "Kom og besøg vores hyggelige krostue.",
};

export default function KrostuePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Krostue"
          title="Krostue"
          description="Kom og besøg vores hyggelige krostue."
          image={IMAGES.roomLounge}
          imageAlt="Krostue hos Mikkelborg Kro"
        />

        <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
          <div className="mx-auto max-w-3xl space-y-8">
            <div className="border border-primary/20 bg-surface-container p-8 text-center md:p-12">
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                Lukket ligesom restauranten er lukket pga. salg.
              </p>
            </div>
            <p className="font-body-md text-center text-on-surface-variant">
              Værelser og selskaber bookes fortsat. Kontakt os på tlf.{" "}
              <a href={SITE.phoneHref} className="text-primary hover:underline">
                {SITE.phone}
              </a>
              .
            </p>
          </div>
        </section>

        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
