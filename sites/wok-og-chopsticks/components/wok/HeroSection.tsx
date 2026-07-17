import {
  EditableImage,
  EditableLink,
  EditableText,
} from "@autosites/cms/components";
import { IMAGES } from "@/lib/images";

export async function HeroSection() {
  return (
    <section className="relative flex h-screen min-h-[640px] items-center justify-center overflow-hidden text-center text-white">
      <div className="absolute inset-0">
        <EditableImage
          cmsKey="home.hero.image"
          fallback={{
            src: IMAGES.hero,
            alt: "Wok og Chopsticks i Næstved",
          }}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="wok-hero-gradient absolute inset-0" />
      </div>

      <div className="relative z-10 max-w-4xl px-6 pt-20">
        <h1 className="wok-reveal mb-6 font-serif text-4xl leading-tight uppercase tracking-wide md:text-6xl lg:text-7xl">
          <EditableText
            cmsKey="home.hero.heading"
            fallback="Velkommen til Wok og Chopsticks"
            as="span"
          />
        </h1>
        <p className="wok-reveal wok-reveal-delay-1 mx-auto mb-10 max-w-2xl text-lg font-light leading-relaxed opacity-90 md:text-xl">
          <EditableText
            cmsKey="home.hero.intro"
            fallback="Kinesisk restaurant på Axeltorv i Næstved — frokost, aftenbuffet, à la carte og selskaber op til 140 personer."
            as="span"
          />
        </p>
        <div className="wok-reveal wok-reveal-delay-2">
          <EditableLink
            cmsKey="home.hero.cta"
            fallback={{ href: "/aftenbuffet", label: "Se vores buffet →" }}
            className="wok-btn rounded-sm"
          />
        </div>
      </div>
    </section>
  );
}
