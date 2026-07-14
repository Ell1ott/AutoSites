import { SITE } from "@/lib/site-config";

export function CtaSection() {
  return (
    <section className="border-y border-primary/10 bg-primary/5 py-section-gap">
      <div className="mx-auto max-w-container-max px-margin-mobile text-center md:px-margin-desktop">
        <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-8 italic">
          Vi glæder os til at byde dig velkommen på Mikkelborg Kro.
        </h2>
        <p className="font-body-lg text-body-lg mx-auto mb-8 max-w-2xl text-on-surface-variant">
          Ønsker du at bestille overnatning eller har du spørgsmål, kan du ringe på tlf. {SITE.phone}.
        </p>
        <div className="flex justify-center gap-8">
          <a
            href={SITE.phoneHref}
            className="bg-primary px-12 py-5 font-label-caps text-label-caps font-bold tracking-[0.2em] text-on-primary uppercase transition-all duration-300 hover:bg-primary-fixed-dim"
          >
            Ring {SITE.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
