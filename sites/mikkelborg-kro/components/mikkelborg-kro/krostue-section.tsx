import Link from "next/link";
import { IMAGES } from "@/lib/images";

export function KrostueSection() {
  return (
    <section className="bg-surface-container-low py-section-gap">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="grid grid-cols-1 items-center gap-gutter lg:grid-cols-2">
          <div className="group relative aspect-[4/3] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMAGES.roomLounge}
              alt="Krostue hos Mikkelborg Kro"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>

          <div className="space-y-8">
            <span className="font-label-caps text-label-caps tracking-[0.3em] text-primary uppercase">
              Krostue
            </span>
            <h2 className="font-headline-md text-headline-md border-l-4 border-primary pl-6">
              Kom og besøg vores hyggelige krostue
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Lukket ligesom restauranten er lukket pga. salg. Værelser og selskaber bookes fortsat
              — ring gerne for at høre nærmere.
            </p>
            <Link
              href="/krostue"
              className="inline-block border-b border-primary pb-1 font-label-caps text-label-caps text-primary transition-colors hover:text-primary-fixed"
            >
              Læs mere om krostuen
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
