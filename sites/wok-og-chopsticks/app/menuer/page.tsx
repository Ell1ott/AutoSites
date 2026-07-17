import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "@/components/wok/SiteFrame";
import { PageHero } from "@/components/wok/PageHero";
import {
  PromoStrip,
  SectionHeading,
  SetMenuCard,
} from "@/components/wok/MenuDesign";
import { SET_MENUS } from "@/lib/menus";
import { SITE, TAKEAWAY_DISCOUNT } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Menuer",
  description:
    "Jiang Nan, kinesisk ristaffel, Wok Menu og Chopsticks Menu hos Wok og Chopsticks.",
};

export default function MenuerPage() {
  return (
    <SiteFrame>
      <PageHero
        title="Menuer"
        subtitle="Faste menuer til deling — fra Jiang Nan til Chopsticks"
      />

      <section className="bg-brand-cream py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="leading-relaxed text-gray-700">{TAKEAWAY_DISCOUNT}</p>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            title="Vælg din menu"
            subtitle="Alle menuer kræver minimum 2 personer"
          />
          <div className="grid gap-10 md:grid-cols-2">
            {SET_MENUS.map((menu) => (
              <SetMenuCard key={menu.name} menu={menu} />
            ))}
          </div>
        </div>
      </section>

      <PromoStrip>
        <h2 className="mb-4 font-serif text-3xl uppercase tracking-widest">
          Klar til at bestille?
        </h2>
        <p className="mb-8 text-white/75">
          Ring til os på {SITE.phone}, eller book bord online.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href={SITE.phoneHref}
            className="inline-block bg-brand-red px-8 py-3 text-sm uppercase tracking-widest text-white no-underline hover:opacity-90"
          >
            Ring nu
          </a>
          <Link
            href="/reservation"
            className="inline-block border border-white/40 px-8 py-3 text-sm uppercase tracking-widest text-white no-underline hover:bg-white hover:text-brand-dark"
          >
            Book bord →
          </Link>
        </div>
      </PromoStrip>
    </SiteFrame>
  );
}
