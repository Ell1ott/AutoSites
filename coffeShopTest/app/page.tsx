import { CollectionSection } from "@/components/kaffe/collection-section";
import { FlutedDivider } from "@/components/kaffe/fluted-divider";
import { Grain } from "@/components/kaffe/grain";
import { Hero } from "@/components/kaffe/hero";
import { HoursSection } from "@/components/kaffe/hours-section";
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
              fallback="<i>Kaffe, kage og hygge midt i Sorø</i>"
              as="h1"
            />
          }
          eyebrow={
            <EditableText
              cmsKey="home.hero.eyebrow"
              fallback="STORGADE 27 — SORØ"
            />
          }
          lede={
            <EditableText
              cmsKey="home.hero.lede"
              fallback="En hyggelig café og butik på Storgade i Sorø. Vi serverer kaffe, kage, brunch og lette retter — og holder åbent for private selskaber og arrangementer."
            />
          }
          cta={
            <EditableLink
              cmsKey="home.hero.cta"
              fallback={{ href: "https://www.facebook.com/kaffemere", label: "Book bord eller selskab" }}
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
              sizes="(max-width: 768px) 100vw, (max-width: 1440px) 50vw, 720px"
              className="object-cover"
            />
          }
        />
        <FlutedDivider />
        <CollectionSection />
        <PhilosophySection />
        <HoursSection />
        <SpaceSection />
      </main>
      <SiteFooter />
    </>
  );
}
