import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/mikkelborg-kro/site-footer";
import { SiteHeader } from "@/components/mikkelborg-kro/site-header";
import { CtaSection } from "@/components/mikkelborg-kro/cta-section";
import { DagensRetSection } from "@/components/mikkelborg-kro/dagens-ret-section";
import { OrnateDivider } from "@/components/mikkelborg-kro/ornate-divider";
import { PageHero } from "@/components/mikkelborg-kro/page-hero";
import { IMAGES } from "@/lib/images";
import { RESTAURANT_INFO } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Restaurant | Mikkelborg Kro",
  description:
    "Restaurant og café hos Mikkelborg Kro. Se dagens ret, åbningstider og menukort.",
};

export default function CafeRestaurantPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Restaurant"
          title={RESTAURANT_INFO.status}
          description={`${RESTAURANT_INFO.statusDetail}. ${RESTAURANT_INFO.bookingNote}`}
          image={IMAGES.diningInterior}
          imageAlt="Restaurant hos Mikkelborg Kro"
        />

        <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
          <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
            <div className="space-y-8">
              <div>
                <h2 className="font-headline-md text-headline-md mb-6 border-l-4 border-primary pl-6">
                  Åbningstider
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  {RESTAURANT_INFO.openingHours}
                </p>
                <p className="font-body-md mt-4 text-on-surface-variant">
                  {RESTAURANT_INFO.preorderNote}
                </p>
              </div>

              <div>
                <h2 className="font-headline-md text-headline-md mb-6 border-l-4 border-primary pl-6">
                  Priser
                </h2>
                <p className="font-body-md mb-6 text-on-surface-variant">
                  {RESTAURANT_INFO.portionNote}
                </p>
                <div className="space-y-4">
                  {RESTAURANT_INFO.portionPrices.map((item) => (
                    <div key={item.label} className="dot-leader font-body-md text-body-md">
                      <span>{item.label}</span>
                      <span className="price font-label-caps text-label-caps text-primary/80">
                        Pris: kr. {item.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DagensRetSection />
          </div>
        </section>

        <OrnateDivider icon="restaurant_menu" />

        <section className="mx-auto max-w-container-max px-margin-mobile pb-section-gap md:px-margin-desktop">
          <div className="border border-primary/20 bg-surface-container p-8 text-center md:p-12">
            <h2 className="font-headline-md text-headline-md mb-4 text-primary">Menukort</h2>
            <p className="font-body-lg text-body-lg mb-8 text-on-surface-variant">
              Se vores fulde á la carte menukort med forretter, hovedretter, dessert og drikkevarer.
            </p>
            <Link
              href="/cafe-restaurant/menukort"
              className="inline-block bg-primary px-10 py-5 font-label-caps text-label-caps tracking-widest text-on-primary uppercase transition-all duration-300 hover:bg-primary-fixed-dim"
            >
              Se menukort
            </Link>
          </div>
        </section>

        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
