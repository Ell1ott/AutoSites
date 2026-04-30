import { HeroParallaxImage } from "./HeroParallaxImage";
import { SectionTag } from "./SectionTag";
import { SiteHeaderNav } from "./SiteHeaderNav";

export function HeroSection() {
  return (
    <header className="bachs-header" id="top">
      <SiteHeaderNav />

      <div className="hero-main">
        <div className="hero-img-wrapper">
          <HeroParallaxImage />
        </div>
        <div className="hero-content">
          <SectionTag>Dagens Bagværk</SectionTag>
          <h1>Langsom tid i hver en bid.</h1>
          <p>
            Vi ærer det danske bagerhåndværk med surdej, lokale kornsorter og
            tålmodighed. Besøg os i hjertet af Aarhus.
          </p>
          <a href="#menu" className="btn-primary">
            Se dagens menu
          </a>
        </div>
        <div className="vertical-label" aria-hidden>
          Morgenfrisk • Siden 1982
        </div>
      </div>
    </header>
  );
}
