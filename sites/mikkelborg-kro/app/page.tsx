import { SiteFooter } from "@/components/mikkelborg-kro/site-footer";
import { SiteHeader } from "@/components/mikkelborg-kro/site-header";
import { CtaSection } from "@/components/mikkelborg-kro/cta-section";
import { DiningSection } from "@/components/mikkelborg-kro/dining-section";
import { HeritageSection } from "@/components/mikkelborg-kro/heritage-section";
import { HomeCards } from "@/components/mikkelborg-kro/home-cards";
import { HomeHero } from "@/components/mikkelborg-kro/home-hero";
import { KrostueSection } from "@/components/mikkelborg-kro/krostue-section";
import { OrnateDivider } from "@/components/mikkelborg-kro/ornate-divider";
import { RetreatsSection } from "@/components/mikkelborg-kro/retreats-section";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <HomeHero />
        <HomeCards />
        <HeritageSection />
        <OrnateDivider />
        <DiningSection />
        <RetreatsSection />
        <OrnateDivider />
        <KrostueSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
