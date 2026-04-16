"use client";

import { useEffect, useState, type ReactNode } from "react";

type HeroProps = {
  title?: ReactNode;
  eyebrow?: ReactNode;
  lede?: ReactNode;
  cta?: ReactNode;
  image?: ReactNode;
};

export function Hero({ title, eyebrow, lede, cta, image }: HeroProps) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="container kaffe-hero">
      <div className="kaffe-hero-image-wrap">
        <div
          className="[filter:grayscale(20%)_sepia(10%)]"
          style={{
            position: "absolute",
            inset: 0,
            transform: `translateY(${scrollY * 0.1}px) scale(1.1)`,
          }}
        >
          {image}
        </div>
      </div>
      <div className="kaffe-hero-content">
        <span className="kaffe-metadata">{eyebrow}</span>
        {title}
        <p className="kaffe-hero-lede">{lede}</p>
        {cta}
      </div>
    </section>
  );
}
