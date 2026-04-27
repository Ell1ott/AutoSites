import {
  EditableImage,
  EditableLink,
  EditableText,
} from "@autosites/cms/components";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=1000";

export async function HeroSection() {
  return (
    <section id="home" className="hero" aria-labelledby="hero-heading">
      <div className="hero-content">
        <h1 id="hero-heading">
          <EditableText
            cmsKey="hero.heading"
            fallback="pizza<br />&amp; grill."
            as="span"
          />
        </h1>
        <div
          className="dotted-line"
          style={{ borderColor: "var(--cream)" }}
        />
        <p>
          <EditableText
            cmsKey="hero.intro"
            fallback="Midt i Sorø laver vi hjemmelavet mad med masser af kærlighed og friske råvarer. Pizza, burgere, pasta, salater og grillretter — spis i caféen eller tag maden med hjem."
            as="span"
          />
        </p>
        <EditableLink
          cmsKey="hero.ctaMenu"
          fallback={{ href: "/menu", label: "Se menuen" }}
          className="btn-outline"
          style={{ borderColor: "var(--cream)", color: "var(--cream)" }}
        />
      </div>
      <div className="hero-img">
        <EditableImage
          cmsKey="hero.image"
          fallback={{
            src: HERO_IMAGE,
            alt: "Varm pizza med ost og friske toppings",
          }}
          fill
          sizes="(max-width: 900px) 100vw, 50vw"
          priority
        />
      </div>

      <div className="badge-price">
        <EditableText cmsKey="hero.badgeTime" fallback="11–15" as="span" />
        <EditableText cmsKey="hero.badgeLabel" fallback="frokost" as="span" />
      </div>
      <div className="tape-label">
        <EditableText
          cmsKey="hero.tape"
          fallback="RING &amp; BESTIL<br />RING &amp; BESTIL<br />RING &amp; BESTIL"
          as="span"
        />
      </div>
      <div className="diagonal-banner">
        <EditableText
          cmsKey="hero.banner"
          fallback="Familievenlig café · Sorø"
          as="span"
        />
      </div>
    </section>
  );
}
