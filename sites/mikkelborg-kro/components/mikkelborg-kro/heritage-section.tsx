import Link from "next/link";
import { IMAGES } from "@/lib/images";

export function HeritageSection() {
  return (
    <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
      <div className="grid grid-cols-1 items-center gap-gutter md:grid-cols-12">
        <div className="space-y-8 md:col-span-7">
          <span className="font-label-caps text-label-caps tracking-[0.3em] text-primary uppercase">
            Om os
          </span>
          <h2 className="font-headline-md text-headline-md border-l-4 border-primary pl-6">
            Velkommen på Mikkelborg Kro
          </h2>
          <p className="font-body-lg text-body-lg max-w-2xl text-on-surface-variant">
            Mikkelborg Kro drives af Kate, som overtog kroen for 18 år siden. Der er blevet drevet
            restaurant de sidste 13 år, men denne er lukket nu pga. salg. Kroen er omgivet af en stor
            have og Skodborg Skov, og ligger 15 minutters kørsel fra byen Rødding.
          </p>
          <ul className="space-y-4 font-body-md text-on-background">
            <li className="diamond-bullet">
              Vi tilbyder gratis trådløs internetadgang og fri parkering på selve ejendommen.
            </li>
            <li className="diamond-bullet">
              Alle værelser er lyse og individuelt indrettede med opholdsområde og eget badeværelse
              med bruser.
            </li>
            <li className="diamond-bullet">
              Royal Oak Golf Club er omkring 8-minutters kørsel væk, mens Anholm Fiskesø ligger 15
              minutter væk i bil.
            </li>
          </ul>
          <Link
            href="/om-os"
            className="inline-block border-b border-primary pb-1 font-label-caps text-label-caps text-primary transition-colors hover:text-primary-fixed"
          >
            Læs mere om os
          </Link>
        </div>

        <div className="group relative md:col-span-5">
          <div className="absolute -inset-4 border border-primary/20 transition-all duration-700 group-hover:scale-105" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={IMAGES.heritage}
            alt="Mikkelborg Kro"
            className="relative z-10 aspect-[4/5] w-full object-cover grayscale-[0.3] transition-all duration-700 hover:grayscale-0"
          />
        </div>
      </div>
    </section>
  );
}
