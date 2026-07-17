import Link from "next/link";
import { IMAGES } from "@/lib/images";
import {
  HOURS,
  HOURS_NOTES,
  LINKS,
  MAIN_NAV,
  PARTY_INFO,
  SITE,
  STATS,
  SUMMER_NOTICE,
  TESTIMONIALS,
  TUESDAY_NOTICE,
} from "@/lib/site-config";

/**
 * Pixel-faithful port of design.html — Danish content from wokogchopsticks.dk
 */
export function HomePage() {
  return (
    <>
      <div className="bg-brand-dark text-white text-xs py-2 px-6 flex justify-between items-center border-b border-gray-800">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span className="flex items-center gap-2">
            <span className="opacity-70" aria-hidden>
              📍
            </span>
            {SITE.address}
          </span>
          <a
            href={SITE.phoneHref}
            className="flex items-center gap-2 text-white no-underline hover:text-brand-gold"
          >
            <span className="opacity-70" aria-hidden>
              📞
            </span>
            {SITE.phone}
          </a>
        </div>
        <div className="hidden sm:flex space-x-4 opacity-80">
          <a
            href={LINKS.wolt}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white no-underline hover:text-brand-gold"
          >
            Wolt
          </a>
          <a
            href={LINKS.maps}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white no-underline hover:text-brand-gold"
          >
            Kort
          </a>
        </div>
      </div>

      <header className="absolute top-10 left-0 w-full z-50 px-4 md:px-10">
        <nav className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 no-underline shrink-0">
            <div className="w-12 h-12 bg-brand-red rounded-full flex items-center justify-center text-white font-bold italic">
              WOC
            </div>
            <div className="text-white">
              <p className="text-xl font-bold tracking-widest leading-none uppercase">
                Wok og
              </p>
              <p className="text-sm tracking-[0.2em] uppercase">Chopsticks</p>
            </div>
          </Link>
          <ul className="hidden xl:flex flex-wrap justify-center gap-x-5 gap-y-2 text-white text-xs font-medium uppercase tracking-wider list-none m-0 p-0">
            {MAIN_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={
                    item.href === "/"
                      ? "text-brand-red no-underline"
                      : "hover:text-brand-red transition no-underline"
                  }
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            className="bg-transparent border border-white text-white px-4 py-2 text-xs uppercase tracking-widest hover:bg-white hover:text-brand-dark transition no-underline shrink-0"
            href="/reservation"
          >
            Book bord
          </Link>
        </nav>
      </header>

      <section className="relative h-screen flex items-center justify-center text-center text-white overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Wok og Chopsticks"
          className="absolute inset-0 w-full h-full object-cover"
          src={IMAGES.hero}
        />
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative z-10 max-w-4xl px-6 pt-20">
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-brand-gold">
            {SITE.tagline}
          </p>
          <h1 className="text-5xl md:text-7xl font-serif mb-6 leading-tight uppercase tracking-wide">
            Velkommen til
            <br />
            Wok og Chopsticks
          </h1>
          <p className="text-lg md:text-xl font-light mb-10 max-w-2xl mx-auto opacity-90 leading-relaxed">
            Kinesisk restaurant på Axeltorv i Næstved — frokost, aftenbuffet, à
            la carte og selskaber op til 140 personer.
          </p>
          <Link
            href="/aftenbuffet"
            className="inline-block bg-brand-red hover:bg-red-800 text-white px-8 py-3 rounded-sm uppercase tracking-widest text-sm transition-all duration-300 no-underline"
          >
            Se vores buffet →
          </Link>
        </div>
      </section>

      <section className="bg-brand-red text-white py-10 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h2 className="font-serif text-2xl uppercase tracking-wider">
            {SUMMER_NOTICE.title}
          </h2>
          <p className="leading-relaxed opacity-95">{SUMMER_NOTICE.body}</p>
          <p className="text-sm opacity-90">{TUESDAY_NOTICE}</p>
        </div>
      </section>

      <section className="py-24 bg-brand-cream relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div className="relative z-10">
            <h2 className="text-4xl font-serif uppercase mb-6 tracking-wider">
              Om restauranten
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {PARTY_INFO.capacity} {PARTY_INFO.occasions}
            </p>
            <ul className="mb-8 space-y-2 text-gray-700 list-none m-0 p-0">
              {PARTY_INFO.amenities.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <Link
              href="/billeder"
              className="inline-block bg-brand-red text-white px-8 py-3 uppercase tracking-widest text-sm hover:opacity-90 transition no-underline"
            >
              Se billeder →
            </Link>
          </div>
          <div className="relative">
            <div className="absolute -top-4 -left-4 w-full h-full border border-brand-red/20 rounded-xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Restaurant Wok og Chopsticks"
              className="relative rounded-xl shadow-2xl w-full h-[400px] object-cover"
              src={IMAGES.story}
            />
          </div>
        </div>
      </section>

      <section className="py-16 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-serif font-bold text-brand-red">
                {stat.value}
              </div>
              <div className="text-gray-500 text-sm uppercase tracking-widest mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif uppercase tracking-widest mb-2">
            Vores menuer
          </h2>
          <div className="w-24 h-px bg-brand-red mx-auto" />
        </div>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Featured — Aftenbuffet */}
            <Link
              href="/aftenbuffet"
              className="group relative h-[400px] overflow-hidden rounded-xl no-underline md:col-span-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Aftenbuffet"
                src={IMAGES.siewMai}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8">
                <h3 className="mb-2 font-serif text-xl text-white md:text-2xl">
                  Luksus aftenbuffet &amp; barbecue
                </h3>
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                  <p className="max-w-md text-sm text-gray-300">
                    Fra kl. 16.30 — forret, varm buffet, barbecue, sushi, salatbar
                    og fri isbar. Pr. person 249,- / børn under 12 år 129,-
                  </p>
                  <span className="shrink-0 border border-white/50 px-4 py-2 text-xs uppercase tracking-widest text-white transition group-hover:bg-white group-hover:text-black">
                    Se buffet →
                  </span>
                </div>
              </div>
            </Link>

            {/* Frokost */}
            <Link
              href="/frokost"
              className="group relative h-[400px] overflow-hidden rounded-xl no-underline"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Frokost"
                src={IMAGES.chopsticks}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/20 transition group-hover:bg-black/40" />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 via-transparent to-transparent p-6">
                <h3 className="mb-1 font-serif text-xl text-white">Frokost</h3>
                <p className="text-sm text-gray-300">
                  Buffet fra 145,- · China Box 89,-
                </p>
              </div>
            </Link>

            {/* A La Carte */}
            <Link
              href="/a-la-carte"
              className="group relative h-[400px] overflow-hidden rounded-xl no-underline"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="A La Carte"
                src={IMAGES.noodles}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 via-transparent to-transparent p-6">
                <h3 className="mb-1 font-serif text-xl text-white">A La Carte</h3>
                <p className="text-sm text-gray-300">
                  Forretter, fisk, kød, and &amp; dessert
                </p>
              </div>
            </Link>

            {/* Menuer + Buffet ud af huset */}
            <Link
              href="/menuer"
              className="group relative h-[400px] overflow-hidden rounded-xl no-underline md:col-span-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Faste menuer"
                src={IMAGES.goldenDish}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8">
                <h3 className="mb-2 font-serif text-xl text-white md:text-2xl">
                  Faste menuer &amp; buffet ud af huset
                </h3>
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                  <p className="max-w-md text-sm text-gray-300">
                    Jiang Nan, ristaffel, Wok Menu og Chopsticks Menu — eller
                    buffet til afhentning fra 10 personer med 20% rabat.
                  </p>
                  <span className="shrink-0 border border-white/50 px-4 py-2 text-xs uppercase tracking-widest text-white transition group-hover:bg-white group-hover:text-black">
                    Se menuer →
                  </span>
                </div>
              </div>
            </Link>
          </div>
          <div className="mt-12 flex justify-center gap-2">
            <span className="h-2 w-2 rounded-full border border-brand-red bg-brand-red" />
            <span className="h-2 w-2 rounded-full border border-gray-300" />
            <span className="h-2 w-2 rounded-full border border-gray-300" />
            <span className="h-2 w-2 rounded-full border border-gray-300" />
          </div>
        </div>
      </section>

      <section className="relative py-32 flex items-center justify-center text-center text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          src={IMAGES.promo}
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-4xl px-6">
          <h2 className="text-4xl md:text-5xl font-serif uppercase tracking-widest mb-6">
            Bestil takeaway på Wolt
          </h2>
          <p className="text-lg opacity-80 mb-10 max-w-2xl mx-auto leading-relaxed">
            Du kan også bestille direkte via Wolt — eller ringe til restauranten
            på {SITE.phone}.
          </p>
          <a
            href={LINKS.wolt}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-brand-red px-10 py-3 uppercase tracking-widest text-sm hover:scale-105 transition text-white no-underline"
          >
            Åbn Wolt →
          </a>
        </div>
      </section>

      <section className="py-24 bg-brand-dark text-white relative overflow-hidden">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif uppercase tracking-widest mb-2">
            Hvad gæsterne siger
          </h2>
          <div className="w-24 h-px bg-brand-red mx-auto" />
        </div>
        <div className="max-w-4xl mx-auto px-6 text-center relative">
          <p className="text-lg italic leading-relaxed text-gray-300 mb-8">
            {TESTIMONIALS[0].quote}
          </p>
          <p className="text-2xl font-serif italic text-brand-gold">
            {TESTIMONIALS[0].name}
          </p>
        </div>
      </section>

      <section className="py-24 bg-white" id="reservation">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="text-4xl font-serif uppercase tracking-widest mb-6">
              Åbningstider
            </h2>
            <ul className="space-y-3 text-gray-700 list-none m-0 p-0 mb-6">
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
              <p key={note} className="text-sm text-gray-500 mb-2">
                {note}
              </p>
            ))}
            <Link
              href="/reservation"
              className="inline-block mt-8 bg-brand-red text-white px-8 py-3 uppercase tracking-widest text-sm hover:opacity-90 transition no-underline"
            >
              Book bord →
            </Link>
          </div>
          <div className="relative">
            <div className="absolute -top-4 -left-4 w-full h-full border border-brand-red/20 rounded-lg" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Restaurantens interiør"
              className="relative rounded-lg shadow-xl w-full h-[500px] object-cover"
              src={IMAGES.reservation}
            />
          </div>
        </div>
      </section>

      <section className="relative min-h-[500px] flex items-stretch">
        <div className="w-full md:w-3/5 relative overflow-hidden bg-brand-dark">
          <div className="relative z-10 p-12 md:p-20 flex flex-col justify-center min-h-[500px] text-white">
            <h3 className="text-3xl font-serif mb-2">Kontakt os</h3>
            <p className="text-gray-300 mb-8">
              Ring, find vej, eller bestil takeaway.
            </p>
            <ul className="space-y-4 text-sm list-none m-0 p-0">
              <li>
                <a
                  href={SITE.phoneHref}
                  className="text-white no-underline hover:text-brand-gold"
                >
                  Tlf.: {SITE.phone}
                </a>
              </li>
              <li>{SITE.addressLine}</li>
              <li>{SITE.cityLine}</li>
              <li>
                <a
                  href={LINKS.maps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white no-underline hover:text-brand-gold"
                >
                  Find os på kortet →
                </a>
              </li>
              <li>
                <a
                  href={LINKS.rejseplanen}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white no-underline hover:text-brand-gold"
                >
                  Rejseplanen til restauranten →
                </a>
              </li>
            </ul>
            <Link
              href="/kontakt"
              className="inline-block mt-10 bg-brand-red text-white px-8 py-3 uppercase tracking-widest text-sm hover:opacity-90 transition no-underline w-fit"
            >
              Mere kontaktinfo →
            </Link>
          </div>
        </div>
        <div className="hidden md:flex w-2/5 bg-[#f5e6e8] p-12 md:p-20 flex-col justify-center relative">
          <h3 className="text-xl font-bold uppercase tracking-widest mb-6">
            Hurtige links
          </h3>
          <ul className="space-y-4 text-gray-700 text-sm list-none m-0 p-0">
            <li>
              <Link href="/frokost" className="hover:text-brand-red no-underline">
                Frokost
              </Link>
            </li>
            <li>
              <Link
                href="/aftenbuffet"
                className="hover:text-brand-red no-underline"
              >
                Aftenbuffet
              </Link>
            </li>
            <li>
              <Link
                href="/a-la-carte"
                className="hover:text-brand-red no-underline"
              >
                A La Carte
              </Link>
            </li>
            <li>
              <a
                href={LINKS.findsmiley}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand-red no-underline"
              >
                Smiley-rapport
              </a>
            </li>
          </ul>
        </div>
      </section>

      <footer className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-12">
            <div className="text-center md:text-left space-y-4">
              <h4 className="font-bold uppercase tracking-widest text-sm mb-4">
                Kontakt
              </h4>
              <p className="text-sm text-gray-500">📞 {SITE.phone}</p>
              <p className="text-sm text-gray-500">📍 {SITE.address}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-serif font-bold tracking-widest leading-none uppercase">
                Wok og
              </p>
              <p className="text-xs tracking-[0.2em] uppercase mt-1">
                Chopsticks
              </p>
            </div>
            <div className="text-center md:text-right">
              <ul className="text-sm text-gray-600 space-y-2 uppercase tracking-wide list-none m-0 p-0">
                <li>
                  <Link className="hover:text-brand-red no-underline" href="/">
                    Forsiden
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:text-brand-red no-underline"
                    href="/kontakt"
                  >
                    Kontakt os
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:text-brand-red no-underline"
                    href="/privatliv"
                  >
                    Privatlivspolitik
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-gray-100 text-center text-[10px] text-gray-400 uppercase tracking-widest">
            Copyright {new Date().getFullYear()} © {SITE.name}
          </div>
        </div>
      </footer>
    </>
  );
}
