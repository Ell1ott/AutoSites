import type { Metadata } from "next";
import { SiteFooter } from "@/components/mikkelborg-kro/site-footer";
import { SiteHeader } from "@/components/mikkelborg-kro/site-header";
import { CtaSection } from "@/components/mikkelborg-kro/cta-section";
import { PageHero } from "@/components/mikkelborg-kro/page-hero";
import { EXTERNAL_LINKS } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Video | Mikkelborg Kro",
  description:
    "Se Mikkelborg Kros præsentationsvideo — lavet i samarbejde med Trykkeriet.net, Vamdrup.",
};

export default function VideoPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Video"
          title="Video"
          description="Se vores præsentationsvideo herunder."
        />

        <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
          <div className="mx-auto aspect-video max-w-4xl overflow-hidden border-2 border-primary/20">
            <iframe
              src={`https://www.youtube.com/embed/${EXTERNAL_LINKS.youtubeVideoId}?rel=0`}
              title="Mikkelborg Kro præsentationsvideo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </section>

        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
