import type { Metadata } from "next";
import { SiteFrame } from "@/components/wok/SiteFrame";
import { PageHero } from "@/components/wok/PageHero";
import { IMAGES } from "@/lib/images";

export const metadata: Metadata = {
  title: "Billeder af restauranten",
  description: "Billeder fra Wok og Chopsticks i Næstved.",
};

export default function BillederPage() {
  return (
    <SiteFrame>
      <PageHero
        title="Billeder"
        subtitle="Et kig ind i restauranten på Axeltorv."
      />
      <section className="bg-white py-24">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
          {IMAGES.gallery.map((src, i) => (
            <figure
              key={src}
              className="overflow-hidden bg-brand-cream/40 aspect-[4/3]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Wok og Chopsticks — billede ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </figure>
          ))}
        </div>
      </section>
    </SiteFrame>
  );
}
