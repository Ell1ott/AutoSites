import {
  EditableImage,
  EditableLink,
  EditableText,
} from "@autosites/cms/components";

const FEATURED_IMAGE =
  "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=1000";

export async function FeaturedSection() {
  return (
    <section
      id="frokost"
      className="featured"
      aria-labelledby="featured-heading"
    >
      <div className="featured-content">
        <EditableText
          cmsKey="featured.eyebrow"
          fallback="Frokosttilbud"
          as="span"
          className="recipe-of-month"
        />
        <h2 id="featured-heading">
          <EditableText
            cmsKey="featured.heading"
            fallback="tre<br />favorit<br />pizzaer."
            as="span"
          />
        </h2>
        <p>
          <EditableText
            cmsKey="featured.body"
            fallback="Hver dag mellem kl. 11 og 15 kan du få særlig pris på skinkepizza, pepperonipizza og calzone. Perfekt til en fyldig frokostpause — se hele menukortet for detaljer."
            as="span"
          />
        </p>
        <EditableLink
          cmsKey="featured.ctaPhone"
          fallback={{ href: "tel:+4557834466", label: "Ring og bestil" }}
          className="btn-outline"
        />
      </div>
      <div className="featured-img">
        <EditableImage
          cmsKey="featured.image"
          fallback={{
            src: FEATURED_IMAGE,
            alt: "Burger med ost og salat",
          }}
          fill
          sizes="(max-width: 900px) 100vw, 40vw"
        />
      </div>
    </section>
  );
}
