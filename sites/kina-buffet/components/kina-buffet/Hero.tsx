"use client";

import { useEffect, useState } from "react";

const HERO_BG_IMAGES = [
  "https://www.kinabuffet.com/wp-content/uploads/2016/11/kinabuffetslide10.jpg",
  "https://www.kinabuffet.com/wp-content/uploads/2016/11/kinabuffetslide9.jpg",
  "https://www.kinabuffet.com/wp-content/uploads/2016/11/kinabuffetslide6.jpg",
  "https://www.kinabuffet.com/wp-content/uploads/2016/11/kinabuffetslide8.jpg",
  "https://www.kinabuffet.com/wp-content/uploads/2016/11/kinabuffetslide4.jpg",
  "https://www.kinabuffet.com/wp-content/uploads/2016/11/kinabuffetslide3.jpg",
  "https://www.kinabuffet.com/wp-content/uploads/2016/11/kinabuffetslide2.jpg",
  "https://www.kinabuffet.com/wp-content/uploads/2016/11/kinabuffetslide5.jpg",
  "https://www.kinabuffet.com/wp-content/uploads/2016/11/kinabuffetslide7.jpg",
  "https://www.kinabuffet.com/wp-content/uploads/2016/11/kinabuffetslide1.jpg",
] as const;

const SLIDE_INTERVAL_MS = 6500;

export function Hero() {
  const [{ topLayer, layerIndices }, setSlideshow] = useState({
    topLayer: 0 as 0 | 1,
    layerIndices: [0, 1] as [number, number],
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const id = window.setInterval(() => {
      setSlideshow(({ topLayer: top, layerIndices: indices }) => {
        const other = (1 - top) as 0 | 1;
        const nextSlide = (indices[top] + 1) % HERO_BG_IMAGES.length;
        const nextIndices: [number, number] = [indices[0], indices[1]];
        nextIndices[other] = nextSlide;
        return { topLayer: other, layerIndices: nextIndices };
      });
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="hero" aria-label="Velkommen">
      <div className="hero-visual">
        <figure
          className="hero-media"
          role="img"
          aria-label="Kina Buffet — kinesisk buffet og restaurant i Ikast"
        >
          {[0, 1].map((layer) => (
            <div
              key={layer}
              className={`hero-media-slide ${topLayer === layer ? "is-visible" : ""}`}
              style={{
                backgroundImage: `url(${HERO_BG_IMAGES[layerIndices[layer as 0 | 1]]})`,
              }}
              aria-hidden
            />
          ))}
        </figure>
        <div className="hero-copy">
          <p className="hero-flair" aria-hidden>
            Autentisk kinesisk oplevelse
          </p>
          <div className="hero-copy-inner">
            <p className="hero-kicker">Restaurant Kina Buffet</p>
            <h1 className="hero-headline">
              Mad, service og <span>atmosfære</span>
            </h1>
            <p className="hero-lede">
              <strong>Midt i Ikast.</strong> Vi er byens største kinesiske restaurant med plads til over 150
              gæster — buffet og a la carte, autentisk stemning og moderne kinesisk interiør med
              traditionelle undertoner.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
