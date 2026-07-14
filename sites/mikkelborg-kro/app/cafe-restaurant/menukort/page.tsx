import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/mikkelborg-kro/site-footer";
import { SiteHeader } from "@/components/mikkelborg-kro/site-header";
import { CtaSection } from "@/components/mikkelborg-kro/cta-section";
import { MenuList } from "@/components/mikkelborg-kro/menu-list";
import { OrnateDivider } from "@/components/mikkelborg-kro/ornate-divider";
import { PageHero } from "@/components/mikkelborg-kro/page-hero";
import { IMAGES } from "@/lib/images";
import { RESTAURANT_MENU } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Menukort | Mikkelborg Kro",
  description:
    "Á la carte menukort hos Mikkelborg Kro med forretter, hovedretter, burger, dessert, børnemenu og drikkevarer.",
};

export default function MenukortPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Restaurant"
          title="Menukort"
          description="Nyd et dejligt måltid i restauranten."
          image={IMAGES.diningSeafood}
          imageAlt="Menukort hos Mikkelborg Kro"
        />

        <section className="mx-auto max-w-container-max space-y-section-gap px-margin-mobile py-section-gap md:px-margin-desktop">
          <MenuList title="Forretter" items={RESTAURANT_MENU.forretter} />
          <OrnateDivider icon="restaurant" />
          <MenuList title="Hovedretter" items={RESTAURANT_MENU.hovedretter} />
          <OrnateDivider icon="lunch_dining" />
          <MenuList title="Mikkelborg Burger" items={RESTAURANT_MENU.burger} />
          <OrnateDivider icon="cake" />
          <MenuList title="Dessert" items={RESTAURANT_MENU.dessert} />
          <OrnateDivider icon="child_care" />
          <div className="space-y-6">
            <MenuList title="Børnemenu" items={RESTAURANT_MENU.boernemenu} />
            <p className="font-body-md text-on-surface-variant italic">(kun til børn under 12 år)</p>
          </div>
          <OrnateDivider icon="celebration" />
          <MenuList title="Selskaber" items={RESTAURANT_MENU.selskaber} />
          <p className="font-body-md text-on-surface-variant">
            <Link href="/selskaber" className="border-b border-primary text-primary hover:text-primary-fixed">
              Se hele selskabsmenuen
            </Link>
          </p>
          <OrnateDivider icon="local_cafe" />
          <MenuList title="Drikkevare" items={RESTAURANT_MENU.drikkevare} />
          <OrnateDivider icon="wine_bar" />
          <MenuList title="Alkohol" items={RESTAURANT_MENU.alkohol} />
        </section>

        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
