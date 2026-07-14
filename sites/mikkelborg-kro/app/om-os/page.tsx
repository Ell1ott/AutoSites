import type { Metadata } from "next";
import { SiteFooter } from "@/components/mikkelborg-kro/site-footer";
import { SiteHeader } from "@/components/mikkelborg-kro/site-header";
import { OrnateDivider } from "@/components/mikkelborg-kro/ornate-divider";
import { PageHero } from "@/components/mikkelborg-kro/page-hero";
import { EXTERNAL_LINKS } from "@/lib/site-config";
import { IMAGES } from "@/lib/images";

export const metadata: Metadata = {
  title: "Om os | Mikkelborg Kro",
  description:
    "Mikkelborg Kro drives af Kate. Kroen ligger ved Skodborg Skov, 15 minutter fra Rødding, med gratis wifi og parkering.",
};

export default function OmOsPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Om os"
          title="Om Mikkelborg Kro"
          description="Mikkelborg Kro drives af Kate som overtog kroen for 18 år siden."
          image={IMAGES.heritage}
          imageAlt="Mikkelborg Kro"
        />

        <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
          <div className="mx-auto max-w-3xl space-y-8">
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Der er blevet drevet restaurant de sidste 13 år, men denne er lukket nu pga. salg.
              Kroen er omgivet af en stor have og Skodborg Skov, og ligger 15 minutters kørsel fra
              byen Rødding.
            </p>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Vi tilbyder gratis trådløs internetadgang og fri parkering på selve ejendommen. Alle
              værelser er lyse og individuelt indrettede på Mikkelborg Kro, der er et opholdsområde
              og eget badeværelse med bruser. Nogle har også et skrivebord og sovesofa.
            </p>
            <ul className="space-y-4 font-body-md text-on-background">
              <li className="diamond-bullet">
                Royal Oak Golf Club er omkring 8-minutters kørsel væk.
              </li>
              <li className="diamond-bullet">
                Anholm Fiskesø Sø ligger 15 minutter væk i bil.
              </li>
              <li className="diamond-bullet">Legoland ligger 46 km fra kroen.</li>
              <li className="diamond-bullet">
                Også det naturskønne område omkring Jels søerne er et besøg værd.
              </li>
            </ul>
            <a
              href={EXTERNAL_LINKS.smiley}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border-b border-primary pb-1 font-label-caps text-label-caps text-primary transition-colors hover:text-primary-fixed"
            >
              Se Smiley-rapport
            </a>
          </div>
        </section>

        <OrnateDivider icon="nature_people" />
      </main>
      <SiteFooter />
    </>
  );
}
