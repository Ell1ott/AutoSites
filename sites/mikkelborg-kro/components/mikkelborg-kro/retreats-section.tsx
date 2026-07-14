import Link from "next/link";
import { IMAGES } from "@/lib/images";
import { BNB_FACILITIES, BNB_PRICES } from "@/lib/site-config";

export function RetreatsSection() {
  return (
    <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
      <div className="flex flex-col gap-gutter lg:flex-row">
        <div className="lg:w-1/3">
          <span className="font-label-caps text-label-caps tracking-[0.3em] text-primary uppercase">
            Bed & Breakfast
          </span>
          <h2 className="font-display-lg text-display-lg-mobile md:text-headline-md lg:text-display-lg mt-6 mb-8">
            Nyd et dejligt ophold hos os
          </h2>
          <p className="font-body-lg text-body-lg mb-12 text-on-surface-variant">
            Oplev det naturskønne område ved Jels søerne tæt på Mikkelborg. Royal Oak golf klub er
            beliggende ved det naturskønne område ved Jels Søerne. Vejen by er kun 10 minutters kørsel
            væk.
          </p>

          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-3xl text-primary">bed</span>
              <div>
                <h4 className="font-headline-sm text-headline-sm mb-1 text-primary">Faciliteter</h4>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {BNB_FACILITIES[0]}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-3xl text-primary">local_cafe</span>
              <div>
                <h4 className="font-headline-sm text-headline-sm mb-1 text-primary">Vores priser</h4>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {BNB_PRICES[0].label} — pr. overnatning kr. {BNB_PRICES[0].price}
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/bed-breakfast"
            className="mt-10 inline-block border-b border-primary pb-1 font-label-caps text-label-caps text-primary transition-colors hover:text-primary-fixed"
          >
            Se alle priser
          </Link>
        </div>

        <div className="grid h-fit grid-cols-1 gap-base md:grid-cols-2 lg:w-2/3">
          <div className="group relative aspect-square overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMAGES.roomBed}
              alt="Værelse"
              className="h-full w-full object-cover transition-transform duration-[1.5s] group-hover:scale-110"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Link
                href="/bed-breakfast"
                className="bg-primary px-6 py-3 font-label-caps text-label-caps tracking-widest text-on-primary uppercase"
              >
                Se værelser
              </Link>
            </div>
          </div>

          <div className="group relative aspect-square overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMAGES.roomBath}
              alt="Badeværelse"
              className="h-full w-full object-cover transition-transform duration-[1.5s] group-hover:scale-110"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Link
                href="/bed-breakfast"
                className="bg-primary px-6 py-3 font-label-caps text-label-caps tracking-widest text-on-primary uppercase"
              >
                Se faciliteter
              </Link>
            </div>
          </div>

          <div className="group relative h-80 overflow-hidden md:col-span-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMAGES.roomLounge}
              alt="Fællesareal"
              className="h-full w-full object-cover transition-transform duration-[1.5s] group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 to-transparent p-8">
              <div>
                <h4 className="font-headline-sm text-headline-sm text-white">Fællesareal</h4>
                <p className="text-on-surface-variant">
                  Spiseplads, fjernsyn og køleskab. Elkedel, brødrister og fri kaffe/te.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
