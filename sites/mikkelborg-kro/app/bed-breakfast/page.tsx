import type { Metadata } from "next";
import { SiteFooter } from "@/components/mikkelborg-kro/site-footer";
import { SiteHeader } from "@/components/mikkelborg-kro/site-header";
import { CtaSection } from "@/components/mikkelborg-kro/cta-section";
import { OrnateDivider } from "@/components/mikkelborg-kro/ornate-divider";
import { PageHero } from "@/components/mikkelborg-kro/page-hero";
import { IMAGES } from "@/lib/images";
import { BNB_ATTRACTIONS, BNB_FACILITIES, BNB_PRICES, SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Bed & Breakfast | Mikkelborg Kro",
  description:
    "Nyd et dejligt ophold hos os ved Jels søerne. Unikke værelser med eget bad og toilet.",
};

export default function BedBreakfastPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Bed & Breakfast"
          title="Nyd et dejligt ophold hos os"
          description="Oplev det naturskønne område ved Jels søerne tæt på Mikkelborg."
          image={IMAGES.roomBed}
          imageAlt="Bed & Breakfast hos Mikkelborg Kro"
        />

        <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
          <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
            <div className="space-y-8">
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                Nyd et afslappende ophold hos os, og oplev seværdigheder i Mikkelborg omegn. Royal
                Oak golf klub er beliggende ved det naturskønne område ved Jels Søerne. Vejen by er
                kun 10 minutters kørsel væk.
              </p>

              <div>
                <h2 className="font-headline-md text-headline-md mb-6 border-l-4 border-primary pl-6">
                  Faciliteter
                </h2>
                <ul className="space-y-4 font-body-md text-on-background">
                  {BNB_FACILITIES.map((item) => (
                    <li key={item} className="diamond-bullet">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border border-primary/10 bg-surface-container p-8 md:p-12">
              <h2 className="font-headline-md text-headline-md mb-8 text-primary">Vores priser</h2>
              <div className="space-y-4">
                {BNB_PRICES.map((item) => (
                  <div key={item.label} className="dot-leader font-body-md text-body-md">
                    <span>{item.label}</span>
                    <span className="price font-label-caps text-label-caps text-primary/80">
                      Pr. overnatning kr. {item.price}
                    </span>
                  </div>
                ))}
              </div>
              <p className="font-body-md mt-8 text-on-surface-variant">
                Book værelse(r) pr. telefon {SITE.phone}.
              </p>
            </div>
          </div>
        </section>

        <OrnateDivider icon="landscape" />

        <section className="mx-auto max-w-container-max px-margin-mobile pb-section-gap md:px-margin-desktop">
          <h2 className="font-headline-md text-headline-md mb-8 border-l-4 border-primary pl-6">
            Et besøg værd
          </h2>
          <ul className="space-y-4 font-body-md text-on-background">
            {BNB_ATTRACTIONS.map((item) => (
              <li key={item} className="diamond-bullet">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
