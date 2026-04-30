"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const HERO_SRC =
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=2000";

export function HeroParallaxImage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scale = 1 + scrollY / 10000;
  const translateY = scrollY / 20;

  return (
    <Image
      src={HERO_SRC}
      alt="Freshly baked sourdough bread"
      fill
      priority
      sizes="60vw"
      style={{
        objectFit: "cover",
        filter: "grayscale(20%) sepia(10%)",
        transform: `scale(${scale}) translateY(${translateY}px)`,
      }}
    />
  );
}
