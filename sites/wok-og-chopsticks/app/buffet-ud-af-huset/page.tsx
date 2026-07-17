import type { Metadata } from "next";
import { SiteFrame } from "@/components/wok/SiteFrame";
import { PageHero } from "@/components/wok/PageHero";
import { IMAGES } from "@/lib/images";
import {
  BUFFET_EXTRAS,
  BUFFET_PACKAGES,
  SITE,
  TAKEAWAY_DISCOUNT,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Buffet ud af huset",
  description:
    "Bestil buffet ud af huset fra Wok og Chopsticks — fra 10 personer.",
};

export default function BuffetUdAfHusetPage() {
  return (
    <SiteFrame>
      <PageHero
        title="Buffet ud af huset"
        subtitle="Perfekt til firma, fest og familie — fra 10 personer."
      />
      <section className="bg-brand-cream py-12">
        <div className="mx-auto max-w-3xl px-6 text-center text-sm leading-relaxed text-gray-700">
          {TAKEAWAY_DISCOUNT}
        </div>
      </section>
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl space-y-12 px-6">
          {BUFFET_PACKAGES.map((pkg) => (
            <article
              key={`${pkg.title}-${pkg.minGuests}`}
              className="border border-gray-100 p-8 md:p-10"
            >
              <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
                <h2 className="font-serif text-3xl uppercase tracking-wide">
                  {pkg.title}
                </h2>
                <p className="text-sm uppercase tracking-widest text-brand-red">
                  Min. {pkg.minGuests} personer
                </p>
              </div>
              <ul className="mb-8 space-y-2 text-gray-700 list-none m-0 p-0">
                {pkg.items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <p className="font-serif text-xl text-brand-red">
                Pris pr. person: {pkg.price},-
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Opnå 20% rabat ved afhentning — ca. {pkg.pickupPrice},- pr.
                kuvert.
              </p>
            </article>
          ))}
          <div className="space-y-3 border border-brand-red/20 bg-brand-cream px-8 py-6 text-sm text-gray-700">
            {BUFFET_EXTRAS.map((extra) => (
              <p key={extra}>{extra}</p>
            ))}
            <p className="pt-2">
              Ring og bestil:{" "}
              <a href={SITE.phoneHref} className="text-brand-red">
                {SITE.phone}
              </a>
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={IMAGES.tail}
            alt=""
            className="mx-auto h-auto max-w-xs opacity-80"
          />
        </div>
      </section>
    </SiteFrame>
  );
}
