import {
  EditableImage,
  EditableLink,
  EditableText,
} from "@autosites/cms/components";
import { IMAGES } from "@/lib/images";

export async function OurStorySection() {
  return (
    <section id="about" className="relative overflow-hidden bg-brand-cream py-24">
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-16 px-6 md:grid-cols-2">
        <div>
          <h2 className="mb-6 font-serif text-4xl uppercase tracking-wider">
            <EditableText
              cmsKey="home.story.heading"
              fallback="Om restauranten"
              as="span"
            />
          </h2>
          <p className="mb-8 leading-relaxed text-gray-700">
            <EditableText
              cmsKey="home.story.body"
              fallback="Vi kan have selskaber op til 140 personer. Bryllup, konfirmation, fødselsdage, firmafest, julefrokost m.m. Legerum og handicapvenligt."
              as="span"
            />
          </p>
          <EditableLink
            cmsKey="home.story.cta"
            fallback={{ href: "/billeder", label: "Se billeder →" }}
            className="wok-btn"
          />
        </div>
        <div className="wok-img-frame relative">
          <EditableImage
            cmsKey="home.story.image"
            fallback={{
              src: IMAGES.story,
              alt: "Restaurantens interiør",
            }}
            width={800}
            height={500}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="relative h-[400px] w-full rounded-xl object-cover shadow-2xl"
          />
        </div>
      </div>
      <div className="pointer-events-none absolute top-0 right-0 opacity-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={IMAGES.decorStory} className="w-96" />
      </div>
    </section>
  );
}
