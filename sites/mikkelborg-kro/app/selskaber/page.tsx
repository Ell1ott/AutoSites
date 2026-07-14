import type { Metadata } from "next";
import { SiteFooter } from "@/components/mikkelborg-kro/site-footer";
import { SiteHeader } from "@/components/mikkelborg-kro/site-header";
import { MenuList } from "@/components/mikkelborg-kro/menu-list";
import { OrnateDivider } from "@/components/mikkelborg-kro/ornate-divider";
import { PageHero } from "@/components/mikkelborg-kro/page-hero";
import { IMAGES } from "@/lib/images";
import { SELSKABER_MENU } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Selskaber | Mikkelborg Kro",
  description:
    "Vi holder alle former for selskaber. Konfirmationer, fødselsdage og festlige lejligheder med hjemmelavet mad.",
};

export default function SelskaberPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Selskaber"
          title="Vi holder alle former for selskaber"
          description="Nyd et dejligt måltid i restauranten."
          image={IMAGES.diningInterior}
          imageAlt="Selskaber hos Mikkelborg Kro"
        />

        <section className="mx-auto max-w-container-max px-margin-mobile pt-section-gap md:px-margin-desktop">
          <div className="mx-auto mb-16 max-w-3xl">
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Vi holder alle former for selskaber — konfirmationer, fødselsdage, jubilæer og andre
              festlige lejligheder. Nyd et dejligt måltid i vores prangende selskabslokaler med
              mulighed for mad, musik og dans.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-container-max space-y-section-gap px-margin-mobile pb-section-gap md:px-margin-desktop">
          <MenuList title="Forretter" items={SELSKABER_MENU.forretter} />
          <OrnateDivider icon="restaurant" />
          <MenuList title="Hovedretter" items={SELSKABER_MENU.hovedretter} />
          <OrnateDivider icon="cake" />
          <MenuList title="Dessert" items={SELSKABER_MENU.dessert} />
          <OrnateDivider icon="coffee" />
          <MenuList title="Ekstra" items={SELSKABER_MENU.ekstra} />
          <MenuList title="Natmad" items={SELSKABER_MENU.natmad} />

          <div className="border border-primary/20 bg-surface-container p-8 md:p-12">
            <h2 className="font-headline-md text-headline-md mb-6 text-primary">NB</h2>
            <ul className="space-y-3 font-body-md text-on-surface-variant">
              {SELSKABER_MENU.notes.map((note) => (
                <li key={note} className="diamond-bullet">
                  {note}
                </li>
              ))}
            </ul>
            <p className="font-body-md mt-8 text-on-background">MVH. Kate Bay</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
