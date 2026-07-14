import Link from "next/link";
import { HOME_CARDS } from "@/lib/site-config";
import { IMAGES } from "@/lib/images";

export function HomeCards() {
  return (
    <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
      <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
        {HOME_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group relative aspect-[4/5] overflow-hidden border border-primary/10 transition-all duration-500 hover:border-primary/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMAGES[card.imageKey]}
              alt={card.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <h3 className="font-headline-sm text-headline-sm mb-2 text-white">{card.title}</h3>
              <p className="font-label-caps text-label-caps tracking-widest text-primary uppercase">
                {card.subtitle}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
