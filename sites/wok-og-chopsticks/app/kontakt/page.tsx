import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "@/components/wok/SiteFrame";
import { PageHero } from "@/components/wok/PageHero";
import { ContactForm } from "@/components/wok/ContactForm";
import {
  HOURS,
  HOURS_NOTES,
  LINKS,
  SITE,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Kontakt os",
  description: "Kontakt Wok og Chopsticks på Axeltorv 9E, 4700 Næstved.",
};

export default function KontaktPage() {
  return (
    <SiteFrame>
      <PageHero
        title="Kontakt os"
        subtitle="Chinese Restaurant · Wok & Chopsticks"
      />
      <section className="bg-white py-24">
        <div className="mx-auto grid max-w-7xl gap-16 px-6 md:grid-cols-2">
          <div>
            <h2 className="mb-6 font-serif text-3xl uppercase tracking-wider">
              Find os
            </h2>
            <p className="mb-1 text-lg font-medium">{SITE.addressLine}</p>
            <p className="mb-6 text-lg text-gray-700">{SITE.cityLine}</p>
            <p className="mb-8">
              <a
                href={SITE.phoneHref}
                className="text-brand-red text-xl no-underline hover:opacity-80"
              >
                Tlf.: {SITE.phone}
              </a>
            </p>
            <ul className="mb-10 space-y-3 text-sm list-none m-0 p-0">
              <li>
                <a
                  href={LINKS.maps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-dark hover:text-brand-red no-underline"
                >
                  Find os på kortet →
                </a>
              </li>
              <li>
                <a
                  href={LINKS.rejseplanen}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-dark hover:text-brand-red no-underline"
                >
                  Rejseplanen til restauranten →
                </a>
              </li>
              <li>
                <a
                  href={LINKS.wolt}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-dark hover:text-brand-red no-underline"
                >
                  Bestil på Wolt →
                </a>
              </li>
              <li>
                <a
                  href={LINKS.findsmiley}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-dark hover:text-brand-red no-underline"
                >
                  Smiley-kontrolrapport →
                </a>
              </li>
            </ul>
            <h3 className="mb-4 font-serif text-2xl uppercase tracking-wide">
              Åbningstider
            </h3>
            <ul className="mb-4 space-y-2 text-gray-700 list-none m-0 p-0">
              {HOURS.map((row) => (
                <li
                  key={row.day}
                  className="flex justify-between gap-6 border-b border-gray-100 pb-2"
                >
                  <span className="font-medium">{row.day}</span>
                  <span>{row.time}</span>
                </li>
              ))}
            </ul>
            {HOURS_NOTES.map((note) => (
              <p key={note} className="text-sm text-gray-500 mb-1">
                {note}
              </p>
            ))}
            <Link
              href="/reservation"
              className="mt-8 inline-block bg-brand-red px-8 py-3 text-sm uppercase tracking-widest text-white no-underline hover:opacity-90"
            >
              Book bord →
            </Link>
          </div>
          <div className="bg-brand-dark p-8 md:p-10 text-white">
            <h2 className="mb-2 font-serif text-3xl">Skriv til os</h2>
            <p className="mb-8 text-gray-300">
              Fortæl os om reservation, selskab eller spørgsmål — så vender vi
              tilbage.
            </p>
            <ContactForm light />
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
