import Link from "next/link";
import { IMAGES } from "@/lib/images";
import { SELSKABER_MENU } from "@/lib/site-config";

export function DiningSection() {
  const forretterPreview = SELSKABER_MENU.forretter.slice(0, 2);
  const dessertPreview = SELSKABER_MENU.dessert.slice(0, 2);

  return (
    <section className="bg-surface-container-low py-section-gap">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="mb-16 text-center">
          <span className="font-label-caps text-label-caps tracking-[0.3em] text-primary uppercase">
            Selskaber
          </span>
          <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg mt-4 mb-6">
            Vi holder alle former for selskaber
          </h2>
          <p className="font-body-lg text-body-lg mx-auto max-w-2xl text-on-surface-variant italic">
            Nyd et dejligt måltid i restauranten. Restauranten er lukket pga. salg, men selskaber
            bookes fortsat.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
          <div className="group border border-primary/10 bg-surface-container p-12 transition-all duration-500 hover:border-primary/40">
            <div className="mb-8 h-64 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={IMAGES.diningSeafood}
                alt="Forretter"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            </div>
            <h3 className="font-headline-sm text-headline-sm mb-4 text-primary">Forretter</h3>
            <p className="font-body-md text-body-md mb-8 text-on-surface-variant">
              Hjemmelavede forretter til selskaber og festlige lejligheder.
            </p>
            <div className="space-y-3 font-label-caps text-label-caps text-primary/80">
              {forretterPreview.map((item) => (
                <div key={item.name} className="dot-leader">
                  <span>{item.name}</span>
                  <span className="price">Pris {item.price}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="group border border-primary/10 bg-surface-container p-12 transition-all duration-500 hover:border-primary/40 lg:-translate-y-8">
            <div className="mb-8 h-64 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={IMAGES.diningInterior}
                alt="Hovedretter"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            </div>
            <h3 className="font-headline-sm text-headline-sm mb-4 text-primary">Hovedretter</h3>
            <p className="font-body-md text-body-md mb-8 text-on-surface-variant">
              Gammeldags retter med brun sovs, kartofler og salatbuffet.
            </p>
            <Link
              href="/selskaber"
              className="border-b border-primary pb-1 font-label-caps text-label-caps text-primary transition-colors hover:text-primary-fixed"
            >
              Se hele menukortet
            </Link>
          </div>

          <div className="group border border-primary/10 bg-surface-container p-12 transition-all duration-500 hover:border-primary/40">
            <div className="mb-8 h-64 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={IMAGES.diningDessert}
                alt="Dessert"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            </div>
            <h3 className="font-headline-sm text-headline-sm mb-4 text-primary">Dessert</h3>
            <p className="font-body-md text-body-md mb-8 text-on-surface-variant">
              Hjemmelavet is, lagkage og klassiske desserter til festen.
            </p>
            <div className="space-y-3 font-label-caps text-label-caps text-primary/80">
              {dessertPreview.map((item) => (
                <div key={item.name} className="dot-leader">
                  <span>{item.name}</span>
                  <span className="price">Pris {item.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
