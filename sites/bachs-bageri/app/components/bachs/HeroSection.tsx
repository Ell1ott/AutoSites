import { HeroParallaxImage } from "./HeroParallaxImage";
import { SectionTag } from "./SectionTag";
import { SiteHeaderNav } from "./SiteHeaderNav";
import { EditableImage, EditableLink, EditableText } from "@autosites/cms/components";
import bachsOverlayImage from "../../../public/bachs-bageri.avif";

export async function HeroSection() {
  return (
    <header className="bachs-header" id="top">
      <SiteHeaderNav />

      <div className="hero-main">
        <div className="hero-img-wrapper">
          <div className="hero-img-main">
            <HeroParallaxImage />
          </div>
          <EditableImage
            cmsKey="hero.overlayImage"
            className="hero-overlay-image"
            fallback={{ src: bachsOverlayImage.src, alt: "" }}
            width={bachsOverlayImage.width}
            height={bachsOverlayImage.height}
            sizes="(min-width: 1025px) 18vw, 0px"
          />
        </div>
        <div className="hero-content">
          <SectionTag>
            <EditableText cmsKey="hero.tag" fallback="Lokalt i Tarm" as="span" />
          </SectionTag>
          <h1>
            <EditableText
              cmsKey="hero.title"
              fallback="Håndværk fra ovnen, hver dag."
              as="span"
            />
          </h1>
          <EditableText
            cmsKey="hero.subtitle"
            fallback="„Bachs Bageri er et gammelt bageri med stolte traditioner!“"
            as="p"
            className="hero-tagline-official"
          />
          <EditableText
            cmsKey="hero.body"
            fallback="Vi er et lokalt håndværksbageri og konditori på Storegade — brød, wienerbrød, kager, smørrebrød og sandwich til takeaway. I dag den eneste bager i byen."
            as="p"
          />
          <EditableLink
            cmsKey="hero.cta"
            fallback={{ href: "#sortiment", label: "Se sortimentet" }}
            className="btn-primary"
          />
        </div>
        <div className="vertical-label" aria-hidden>
          <EditableText
            cmsKey="hero.verticalLabel"
            fallback="Tarm • Siden 1932"
            as="span"
          />
        </div>
      </div>
    </header>
  );
}
