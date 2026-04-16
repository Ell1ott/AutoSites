import { CollectionSection } from "@/components/kaffe/collection-section";
import { FlutedDivider } from "@/components/kaffe/fluted-divider";
import { Grain } from "@/components/kaffe/grain";
import { Hero } from "@/components/kaffe/hero";
import { PhilosophySection } from "@/components/kaffe/philosophy-section";
import { SiteFooter } from "@/components/kaffe/site-footer";
import { SiteHeader } from "@/components/kaffe/site-header";
import { SpaceSection } from "@/components/kaffe/space-section";
import { EditableText } from "@/lib/cms";

export default function Home() {
  return (
    <>
      <Grain />
      <SiteHeader />
      <main>
        <Hero
          title={
            <EditableText
              cmsKey="home.hero.title"
              fallback="Quietude in every pour."
              as="h1"
            />
          }
        />
        <FlutedDivider />
        <CollectionSection />
        <PhilosophySection />
        <SpaceSection />
      </main>
      <SiteFooter />
    </>
  );
}
