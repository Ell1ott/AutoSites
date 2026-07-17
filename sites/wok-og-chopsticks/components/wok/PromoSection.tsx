import {
  EditableImage,
  EditableLink,
  EditableText,
} from "@autosites/cms/components";
import { IMAGES } from "@/lib/images";

export async function PromoSection() {
  return (
    <section className="relative flex items-center justify-center py-32 text-center text-white">
      <div className="absolute inset-0">
        <EditableImage
          cmsKey="home.promo.image"
          fallback={{
            src: IMAGES.promo,
            alt: "Kinesisk madlavning",
          }}
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>
      <div className="relative z-10 max-w-4xl px-6">
        <h2 className="mb-6 font-serif text-4xl uppercase tracking-widest md:text-5xl">
          <EditableText
            cmsKey="home.promo.heading"
            fallback="Bestil takeaway på Wolt"
            as="span"
          />
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed opacity-80">
          <EditableText
            cmsKey="home.promo.body"
            fallback="Du kan bestille via Wolt — eller ringe direkte til restauranten."
            as="span"
          />
        </p>
        <EditableLink
          cmsKey="home.promo.cta"
          fallback={{ href: "/menuer", label: "Se menuer →" }}
          className="wok-btn hover:scale-105"
        />
      </div>
    </section>
  );
}
