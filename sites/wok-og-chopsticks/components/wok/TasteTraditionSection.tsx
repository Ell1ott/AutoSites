import {
  EditableImage,
  EditableLink,
  EditableText,
} from "@autosites/cms/components";
import { IMAGES } from "@/lib/images";

export async function TasteTraditionSection() {
  return (
    <section className="bg-white py-24">
      <div className="mb-16 text-center">
        <h2 className="mb-2 font-serif text-4xl uppercase tracking-widest">
          <EditableText
            cmsKey="home.taste.heading"
            fallback="Vores menuer"
            as="span"
          />
        </h2>
        <div className="wok-rule mx-auto h-px w-24 bg-brand-red" />
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="group relative h-[400px] overflow-hidden rounded-xl md:col-span-2">
            <EditableImage
              cmsKey="home.taste.feature1.image"
              fallback={{
                src: IMAGES.aftenBuffet,
                alt: "Aftenbuffet",
              }}
              fill
              sizes="(max-width: 768px) 100vw, 66vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8">
              <h3 className="mb-2 font-serif text-xl text-white">
                <EditableText
                  cmsKey="home.taste.feature1.title"
                  fallback="Aftenbuffet"
                  as="span"
                />
              </h3>
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                <p className="max-w-md text-sm text-gray-300">
                  <EditableText
                    cmsKey="home.taste.feature1.body"
                    fallback="Det store aftenbuffet-udvalg hos Wok og Chopsticks i Næstved."
                    as="span"
                  />
                </p>
                <EditableLink
                  cmsKey="home.taste.feature1.cta"
                  fallback={{ href: "/aftenbuffet", label: "Se buffet →" }}
                  className="shrink-0 border border-white/50 px-4 py-2 text-xs uppercase tracking-widest text-white transition hover:bg-white hover:text-black no-underline"
                />
              </div>
            </div>
          </div>

          <div className="group relative h-[400px] overflow-hidden rounded-xl">
            <EditableImage
              cmsKey="home.taste.feature2.image"
              fallback={{ src: IMAGES.frokostBuffet, alt: "Frokostbuffet" }}
              fill
              sizes="(max-width: 1024px) 100vw, 33vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20 transition group-hover:bg-black/40" />
          </div>

          <div className="group relative h-[400px] overflow-hidden rounded-xl">
            <EditableImage
              cmsKey="home.taste.feature3.image"
              fallback={{ src: IMAGES.aLaCarte[0], alt: "A la carte" }}
              fill
              sizes="(max-width: 1024px) 100vw, 33vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          </div>

          <div className="group relative h-[400px] overflow-hidden rounded-xl md:col-span-2">
            <EditableImage
              cmsKey="home.taste.feature4.image"
              fallback={{ src: IMAGES.gallery[1], alt: "Restauranten" }}
              fill
              sizes="(max-width: 768px) 100vw, 66vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
