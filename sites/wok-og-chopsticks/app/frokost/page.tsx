import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "@/components/wok/SiteFrame";
import { PageHero } from "@/components/wok/PageHero";
import {
  BuffetColumnList,
  MenuItemRow,
  PriceHighlight,
  PriceTag,
  PromoStrip,
  SectionHeading,
} from "@/components/wok/MenuDesign";
import { IMAGES } from "@/lib/images";
import { CHINA_BOX, FROKOST_BUFFET, FROKOST_RETTER } from "@/lib/menus";

export const metadata: Metadata = {
  title: "Frokost",
  description:
    "Frokostbuffet, frokostretter og China Box hos Wok og Chopsticks i Næstved.",
};

export default function FrokostPage() {
  return (
    <SiteFrame>
      <PageHero
        title="Frokost"
        subtitle="Buffet, à la carte-frokostretter og takeaway China Box"
      />

      {/* Intro + image */}
      <section className="bg-brand-cream py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 md:grid-cols-2">
          <div>
            <h2 className="mb-6 font-serif text-4xl uppercase tracking-wider">
              {FROKOST_BUFFET.title}
            </h2>
            <p className="mb-4 text-sm uppercase tracking-[0.25em] text-brand-red">
              {FROKOST_BUFFET.hours}
            </p>
            <p className="mb-8 leading-relaxed text-gray-700">
              Vælg frit mellem danske klassikere og kinesiske favoritter — fra
              sild og frikadeller til forårsruller, sushi og wok-retter.
            </p>
            <PriceHighlight
              items={FROKOST_BUFFET.pricing}
              note={FROKOST_BUFFET.variationNote}
            />
          </div>
          <div className="relative">
            <div className="absolute -top-4 -left-4 h-full w-full border border-brand-red/20 rounded-xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMAGES.gallery[0]}
              alt="Frokost hos Wok og Chopsticks"
              className="relative h-[420px] w-full rounded-xl object-cover shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Buffet columns */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading title="I buffeten" subtitle="Udvalget kan variere" />
          <div className="grid gap-14 md:grid-cols-2">
            {FROKOST_BUFFET.columns.map((col) => (
              <BuffetColumnList
                key={col.name}
                title={col.name}
                items={col.items}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Menu upgrade */}
      <PromoStrip>
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-brand-gold">
          Opgrader din frokost
        </p>
        <h2 className="mb-4 font-serif text-3xl uppercase tracking-widest md:text-4xl">
          {FROKOST_BUFFET.menuUpgrade.title}
        </h2>
        <p className="mb-6 text-white/75">
          {FROKOST_BUFFET.menuUpgrade.description} —{" "}
          {FROKOST_BUFFET.menuUpgrade.note}
        </p>
        <div className="flex flex-wrap items-end justify-center gap-10">
          <div>
            <p className="mb-1 text-xs uppercase tracking-widest text-white/50">
              Pr. person
            </p>
            <p className="font-serif text-5xl text-brand-gold">
              {FROKOST_BUFFET.menuUpgrade.price},-
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-widest text-white/50">
              Barn under 12 år
            </p>
            <p className="font-serif text-3xl text-white">
              {FROKOST_BUFFET.menuUpgrade.childPrice},-
            </p>
          </div>
        </div>
      </PromoStrip>

      {/* Frokostretter */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-3xl px-6">
          <SectionHeading
            title={FROKOST_RETTER.title}
            subtitle={FROKOST_RETTER.hours}
          />
          <div className="mb-10 flex flex-wrap items-center justify-center gap-4 text-center">
            <p className="text-sm uppercase tracking-widest text-gray-500">
              Frit valg
            </p>
            <PriceTag price={FROKOST_RETTER.choicePrice} className="text-3xl" />
          </div>
          <ul className="m-0 mb-10 list-none p-0">
            {FROKOST_RETTER.items.map((item) => (
              <MenuItemRow key={item.code} item={item} />
            ))}
          </ul>
          <p className="border-t border-gray-100 pt-6 text-center text-sm text-gray-600">
            {FROKOST_RETTER.soupAddOn.label}:{" "}
            <span className="font-serif text-brand-red">
              {FROKOST_RETTER.soupAddOn.price},-
            </span>
          </p>
        </div>
      </section>

      {/* Frokost-menu set */}
      <section className="bg-brand-cream py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <SectionHeading title={FROKOST_RETTER.setMenu.title} />
          <ol className="mx-auto mb-10 max-w-md space-y-4 list-none p-0 m-0">
            {FROKOST_RETTER.setMenu.courses.map((course) => (
              <li
                key={course}
                className="border-b border-brand-red/10 pb-4 font-serif text-lg text-gray-800"
              >
                {course}
              </li>
            ))}
          </ol>
          <p className="font-serif text-5xl text-brand-red">
            {FROKOST_RETTER.setMenu.price},-
          </p>
        </div>
      </section>

      {/* China Box */}
      <section className="bg-white py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 md:grid-cols-2">
          <div className="relative order-2 md:order-1">
            <div className="absolute -top-4 -left-4 h-full w-full border border-brand-red/20 rounded-lg" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMAGES.chopsticks}
              alt="China Box takeaway"
              className="relative h-[400px] w-full rounded-lg object-cover shadow-xl"
            />
          </div>
          <div className="order-1 md:order-2">
            <h2 className="mb-3 font-serif text-4xl uppercase tracking-wider">
              {CHINA_BOX.title}
            </h2>
            <p className="mb-8 text-sm uppercase tracking-[0.2em] text-brand-red">
              {CHINA_BOX.hours}
            </p>
            <ul className="mb-10 space-y-3 list-none p-0 m-0">
              {CHINA_BOX.items.map((item) => (
                <li
                  key={item}
                  className="border-b border-gray-100 pb-3 text-gray-700"
                >
                  {item}
                </li>
              ))}
            </ul>
            <p className="mb-8 font-serif text-4xl text-brand-red">
              {CHINA_BOX.price},-
              <span className="ml-3 text-sm uppercase tracking-widest text-gray-500">
                pr. box
              </span>
            </p>
            <Link
              href="/kontakt"
              className="inline-block bg-brand-red px-8 py-3 text-sm uppercase tracking-widest text-white no-underline hover:opacity-90"
            >
              Bestil / kontakt →
            </Link>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
