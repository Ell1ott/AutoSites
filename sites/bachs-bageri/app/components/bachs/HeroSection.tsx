import { HeroParallaxImage } from "./HeroParallaxImage";
import { SectionTag } from "./SectionTag";
import { SiteHeaderNav } from "./SiteHeaderNav";
import Image from "next/image";
import bachsOverlayImage from "../../../public/bachs-bageri.avif";

export function HeroSection() {
  return (
    <header className="bachs-header" id="top">
      <SiteHeaderNav />

      <div className="hero-main">
        <div className="hero-img-wrapper">
          <div className="hero-img-main">
            <HeroParallaxImage />
          </div>
          <Image
            className="hero-overlay-image"
            src={bachsOverlayImage}
            alt=""
            aria-hidden
            sizes="(min-width: 1025px) 18vw, 0px"
          />
        </div>
        <div className="hero-content">
          <SectionTag>Lokalt i Tarm</SectionTag>
          <h1>Håndværk fra ovnen, hver dag.</h1>
          <p className="hero-tagline-official">
            „Bachs Bageri er et gammelt bageri med stolte traditioner!“
          </p>
          <p>
            Vi er et lokalt håndværksbageri og konditori på Storegade — brød,
            wienerbrød, kager, smørrebrød og sandwich til takeaway. I dag den
            eneste bager i byen.
          </p>
          <a href="#sortiment" className="btn-primary">
            Se sortimentet
          </a>
        </div>
        <div className="vertical-label" aria-hidden>
          Tarm • Siden 1932
        </div>
      </div>
    </header>
  );
}
