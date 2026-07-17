import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "@/components/wok/SiteFrame";
import { PageHero } from "@/components/wok/PageHero";
import { MenuCategoryBlock, PromoStrip } from "@/components/wok/MenuDesign";
import { A_LA_CARTE } from "@/lib/menus";
import { TAKEAWAY_DISCOUNT } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "A La Carte",
  description:
    "Komplet à la carte-menu hos Wok og Chopsticks — forretter, fisk, kød, and, ris, nudler og dessert.",
};

export default function ALaCartePage() {
  return (
    <SiteFrame>
      <PageHero
        title="A La Carte"
        subtitle="Fra wan tan og forårsruller til Canton-and og dessert"
      />

      <nav className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-6 py-4 text-xs uppercase tracking-widest">
          {A_LA_CARTE.map((cat) => (
            <a
              key={cat.name}
              href={`#${slugify(cat.name)}`}
              className="shrink-0 px-3 py-1.5 text-gray-600 no-underline transition hover:text-brand-red"
            >
              {cat.name}
            </a>
          ))}
        </div>
      </nav>

      {A_LA_CARTE.map((category, i) => (
        <div key={category.name} id={slugify(category.name)}>
          <MenuCategoryBlock
            category={category}
            tone={i % 2 === 0 ? "white" : "cream"}
          />
        </div>
      ))}

      <PromoStrip>
        <p className="mb-4 text-sm leading-relaxed text-white/80">
          {TAKEAWAY_DISCOUNT}
        </p>
        <Link
          href="/menuer"
          className="inline-block bg-brand-red px-8 py-3 text-sm uppercase tracking-widest text-white no-underline hover:opacity-90"
        >
          Se faste menuer →
        </Link>
      </PromoStrip>
    </SiteFrame>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
