import type { ReactNode } from "react";
import type { MenuCategory, MenuItem, SetMenu } from "@/lib/menus";

export function SectionHeading({
  title,
  english,
  subtitle,
}: {
  title: string;
  english?: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-12 text-center">
      <h2 className="mb-2 font-serif text-3xl uppercase tracking-widest md:text-4xl">
        {title}
      </h2>
      {english ? (
        <p className="mb-3 text-sm italic tracking-wide text-gray-500">
          {english}
        </p>
      ) : null}
      {subtitle ? (
        <p className="mb-4 text-sm uppercase tracking-[0.2em] text-brand-red">
          {subtitle}
        </p>
      ) : null}
      <div className="mx-auto h-px w-24 bg-brand-red" />
    </div>
  );
}

export function PriceTag({
  price,
  className = "",
}: {
  price: string;
  className?: string;
}) {
  return (
    <span className={`shrink-0 font-serif text-lg text-brand-red ${className}`}>
      {price},-
    </span>
  );
}

export function MenuItemRow({ item }: { item: MenuItem }) {
  return (
    <li className="group flex flex-col gap-1 border-b border-gray-100 py-5 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {item.code ? (
            <span className="font-serif text-sm text-brand-gold">{item.code}</span>
          ) : null}
          <h3 className="font-serif text-lg leading-snug md:text-xl">
            {item.name}
          </h3>
          {item.note ? (
            <span className="text-xs uppercase tracking-widest text-brand-red">
              {item.note}
            </span>
          ) : null}
        </div>
        {item.description ? (
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            {item.description}
          </p>
        ) : null}
      </div>
      {item.price ? <PriceTag price={item.price} className="mt-1 sm:mt-0" /> : null}
    </li>
  );
}

export function MenuCategoryBlock({
  category,
  tone = "white",
}: {
  category: MenuCategory;
  tone?: "white" | "cream";
}) {
  return (
    <section
      className={`py-20 md:py-24 ${tone === "cream" ? "bg-brand-cream" : "bg-white"}`}
    >
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeading
          title={category.name}
          english={category.english}
          subtitle={category.note}
        />
        <ul className="m-0 list-none p-0">
          {category.items.map((item) => (
            <MenuItemRow key={`${item.code ?? item.name}-${item.name}`} item={item} />
          ))}
        </ul>
      </div>
    </section>
  );
}

export function PriceHighlight({
  items,
  note,
  tone = "light",
}: {
  items: readonly { label: string; price: string }[];
  note?: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <div
      className={`px-8 py-10 text-center ${
        dark
          ? "border border-white/20 bg-white/5 backdrop-blur-sm"
          : "border border-brand-red/20 bg-white shadow-sm"
      }`}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:justify-center sm:gap-16">
        {items.map((item) => (
          <div key={item.label}>
            <p
              className={`mb-2 text-xs uppercase tracking-[0.25em] ${
                dark ? "text-white/60" : "text-gray-500"
              }`}
            >
              {item.label}
            </p>
            <p
              className={`font-serif text-4xl md:text-5xl ${
                dark ? "text-brand-gold" : "text-brand-red"
              }`}
            >
              {item.price},-
            </p>
          </div>
        ))}
      </div>
      {note ? (
        <p
          className={`mt-6 text-sm italic ${
            dark ? "text-white/60" : "text-gray-500"
          }`}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}

export function SetMenuCard({ menu }: { menu: SetMenu }) {
  return (
    <article className="relative flex h-full flex-col border border-brand-red/15 bg-white p-8 md:p-10">
      <div className="absolute -top-3 -left-3 h-full w-full border border-brand-red/10" />
      <div className="relative z-10 flex h-full flex-col">
        <h3 className="mb-2 font-serif text-3xl uppercase tracking-wider">
          {menu.name}
        </h3>
        <div className="mb-8 h-px w-16 bg-brand-red" />
        <ol className="mb-10 flex-1 space-y-3 list-none p-0 m-0">
          {menu.courses.map((course) => (
            <li
              key={course}
              className="border-b border-gray-100 pb-3 text-sm leading-relaxed text-gray-700 last:border-0"
            >
              {course}
            </li>
          ))}
        </ol>
        <div className="mt-auto">
          <p className="font-serif text-3xl text-brand-red">
            {menu.price},-
            <span className="ml-2 text-sm uppercase tracking-widest text-gray-500">
              pr. person
            </span>
          </p>
          {menu.minPersons ? (
            <p className="mt-2 text-xs uppercase tracking-widest text-gray-400">
              Minimum {menu.minPersons} personer
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function BuffetColumnList({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  return (
    <div>
      <h3 className="mb-6 font-serif text-2xl uppercase tracking-wider">
        {title}
      </h3>
      <ul className="m-0 columns-1 gap-x-10 space-y-2.5 list-none p-0 sm:columns-1">
        {items.map((item) => (
          <li
            key={item}
            className="break-inside-avoid border-b border-brand-red/10 pb-2.5 text-sm text-gray-700"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PromoStrip({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-brand-dark py-16 text-center text-white">
      <div className="relative z-10 mx-auto max-w-3xl px-6">{children}</div>
    </section>
  );
}
