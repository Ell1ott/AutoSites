import Link from "next/link";
import { SITE } from "@/lib/site-config";
import { IMAGES } from "@/lib/images";

export function HomeHero() {
  return (
    <section className="relative flex h-screen min-h-[700px] items-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="hero-gradient absolute inset-0 z-10" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={IMAGES.hero}
          alt="Mikkelborg Kro"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="relative z-20 mx-auto w-full max-w-container-max px-margin-mobile text-center md:px-margin-desktop md:text-left">
        <span className="font-label-caps mb-6 block text-label-caps tracking-[0.3em] text-primary uppercase">
          Mikkelborg Bygade 5 · 6630 Rødding
        </span>
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-8 max-w-3xl leading-tight">
          Velkommen til <span className="font-normal italic">Mikkelborg Kro</span>
        </h1>

        <div className="mt-12 flex flex-col gap-6 md:flex-row">
          <Link
            href="/bed-breakfast"
            className="bg-primary px-10 py-5 font-label-caps text-label-caps tracking-widest text-on-primary uppercase transition-all duration-300 hover:bg-primary-fixed-dim"
          >
            Bed & Breakfast
          </Link>
          <a
            href={SITE.phoneHref}
            className="border border-primary px-10 py-5 font-label-caps text-label-caps tracking-widest text-primary uppercase transition-all duration-300 hover:bg-primary/5"
          >
            Ring {SITE.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
