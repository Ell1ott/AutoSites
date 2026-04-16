"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { CtaMonolith } from "./cta-monolith";
import { Metadata } from "./metadata";
import { heroImageSrc } from "@/lib/kaffe-content";

type HeroProps = {
  title?: ReactNode;
};

export function Hero({ title }: HeroProps) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="container kaffe-hero">
      <div className="kaffe-hero-image-wrap">
        <Image
          src={heroImageSrc}
          alt="Interior"
          fill
          priority
          sizes="(max-width: 1440px) 50vw, 720px"
          className="object-cover [filter:grayscale(20%)_sepia(10%)]"
          style={{
            transform: `translateY(${scrollY * 0.1}px) scale(1.1)`,
          }}
        />
      </div>
      <div className="kaffe-hero-content">
        <Metadata>Est. 2024 — Copenhagen</Metadata>
        {title ?? (
          <h1>
            Quietude <br /> in every <br /> <em>pour.</em>
          </h1>
        )}
        <p className="kaffe-hero-lede">
          A curated ritual of slow-living through the lens of specialty coffee
          and architectural stillness.
        </p>
        <CtaMonolith href="#">Reserve a Table</CtaMonolith>
      </div>
    </section>
  );
}
