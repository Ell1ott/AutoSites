import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "@/components/wok/SiteFrame";
import { PageHero } from "@/components/wok/PageHero";
import {
  PriceHighlight,
  PromoStrip,
  SectionHeading,
} from "@/components/wok/MenuDesign";
import { IMAGES } from "@/lib/images";
import { AFTENBUFFET } from "@/lib/menus";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Aftenbuffet",
  description:
    "Luksus buffet & barbecue hos Wok og Chopsticks — fra kl. 16.30 i Næstved.",
};

export default function AftenbuffetPage() {
  return (
    <SiteFrame>
      <PageHero
        title="Aftenbuffet"
        subtitle="Luksus buffet & barbecue fra kl. 16.30"
      />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={IMAGES.promo}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/65" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-6 py-28 text-center text-white">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-brand-gold">
            {AFTENBUFFET.hours}
          </p>
          <h2 className="mb-6 font-serif text-4xl uppercase tracking-widest md:text-5xl">
            {AFTENBUFFET.title}
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-white/80">
            En aften med forret, varm buffet, barbecue, sushi, salatbar og fri
            isbar — midt i Næstved.
          </p>
          <PriceHighlight items={AFTENBUFFET.pricing} tone="dark" />
        </div>
      </section>

      <section className="bg-brand-cream py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading title="Aftenens oplevelse" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {AFTENBUFFET.sections.map((section, i) => (
              <div
                key={section.name}
                className="border border-brand-red/15 bg-white p-8 transition hover:border-brand-red/40"
              >
                <p className="mb-3 font-serif text-sm text-brand-gold">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mb-3 font-serif text-2xl uppercase tracking-wide">
                  {section.name}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {section.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 md:grid-cols-2">
          <div className="relative">
            <div className="absolute -top-4 -left-4 h-full w-full rounded-xl border border-brand-red/20" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMAGES.gallery[2]}
              alt="Aftenbuffet"
              className="relative h-[440px] w-full rounded-xl object-cover shadow-2xl"
            />
          </div>
          <div>
            <h2 className="mb-6 font-serif text-4xl uppercase tracking-wider">
              Book aftenbord
            </h2>
            <p className="mb-6 leading-relaxed text-gray-700">
              Buffeten starter kl. 16.30. Vi har normalt lukket tirsdag, og
              køkkenet lukker én time før lukketid. Ring gerne i forvejen til
              større selskaber.
            </p>
            <p className="mb-10 text-lg">
              <a href={SITE.phoneHref} className="text-brand-red no-underline">
                {SITE.phone}
              </a>
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/reservation"
                className="inline-block bg-brand-red px-8 py-3 text-sm uppercase tracking-widest text-white no-underline hover:opacity-90"
              >
                Book bord →
              </Link>
              <Link
                href="/menuer"
                className="inline-block border border-brand-dark px-8 py-3 text-sm uppercase tracking-widest text-brand-dark no-underline hover:bg-brand-dark hover:text-white"
              >
                Se faste menuer
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PromoStrip>
        <h2 className="mb-4 font-serif text-3xl uppercase tracking-widest">
          Selskaber op til 140 personer
        </h2>
        <p className="mb-8 text-white/75">
          Bryllup, konfirmation, fødselsdag, firmafest og julefrokost — med
          legerum og handicapvenligt lokale.
        </p>
        <Link
          href="/kontakt"
          className="inline-block border border-white/40 px-8 py-3 text-sm uppercase tracking-widest text-white no-underline hover:bg-white hover:text-brand-dark"
        >
          Spørg om selskab →
        </Link>
      </PromoStrip>
    </SiteFrame>
  );
}
