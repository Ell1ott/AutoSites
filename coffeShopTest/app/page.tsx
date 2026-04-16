import { CollectionSection } from "@/components/kaffe/collection-section";
import { FlutedDivider } from "@/components/kaffe/fluted-divider";
import { Grain } from "@/components/kaffe/grain";
import { Hero } from "@/components/kaffe/hero";
import { PhilosophySection } from "@/components/kaffe/philosophy-section";
import { SiteFooter } from "@/components/kaffe/site-footer";
import { SiteHeader } from "@/components/kaffe/site-header";
import { SpaceSection } from "@/components/kaffe/space-section";
import { EditableImage, EditableLink, EditableText } from "@/lib/cms";

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
          eyebrow={
            <EditableText
              cmsKey="home.hero.eyebrow"
              fallback="Est. 2024 — Copenhagen"
            />
          }
          lede={
            <EditableText
              cmsKey="home.hero.lede"
              fallback="A curated ritual of slow-living through the lens of specialty coffee and architectural stillness."
            />
          }
          cta={
            <EditableLink
              cmsKey="home.hero.cta"
              fallback={{ href: "#", label: "Reserve a Table" }}
              className="kaffe-cta-monolith"
            />
          }
          image={
            <EditableImage
              cmsKey="home.hero.image"
              fallback={{
                src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2070",
                alt: "Interior",
              }}
              fill
              priority
              sizes="(max-width: 1440px) 50vw, 720px"
              className="object-cover"
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
