"use client";

import { useEffect, useRef } from "react";
import { menuProducts } from "./menu-data";
import { ProductCard } from "./ProductCard";
import { SectionTag } from "./SectionTag";

export function MenuSection() {
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      return;
    }

    const mobileQuery = window.matchMedia("(max-width: 760px)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let intervalId: number | null = null;

    const runAutoScroll = () => {
      if (!mobileQuery.matches || reducedMotionQuery.matches) {
        return;
      }

      const cards = grid.querySelectorAll<HTMLElement>(".product-tag");
      if (cards.length < 2) {
        return;
      }

      const step = cards[0].getBoundingClientRect().width + 14;
      const maxScrollLeft = grid.scrollWidth - grid.clientWidth;

      intervalId = window.setInterval(() => {
        const next = grid.scrollLeft + step;
        grid.scrollTo({
          left: next > maxScrollLeft ? 0 : next,
          behavior: "smooth",
        });
      }, 4200);
    };

    const stopAutoScroll = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const restartAutoScroll = () => {
      stopAutoScroll();
      runAutoScroll();
    };

    runAutoScroll();

    grid.addEventListener("touchstart", stopAutoScroll, { passive: true });
    grid.addEventListener("mouseenter", stopAutoScroll);
    grid.addEventListener("touchend", restartAutoScroll, { passive: true });
    grid.addEventListener("mouseleave", restartAutoScroll);
    mobileQuery.addEventListener("change", restartAutoScroll);
    reducedMotionQuery.addEventListener("change", restartAutoScroll);

    return () => {
      stopAutoScroll();
      grid.removeEventListener("touchstart", stopAutoScroll);
      grid.removeEventListener("mouseenter", stopAutoScroll);
      grid.removeEventListener("touchend", restartAutoScroll);
      grid.removeEventListener("mouseleave", restartAutoScroll);
      mobileQuery.removeEventListener("change", restartAutoScroll);
      reducedMotionQuery.removeEventListener("change", restartAutoScroll);
    };
  }, []);

  return (
    <section
      className="section-menu"
      id="sortiment"
      aria-labelledby="menu-heading"
    >
      <div className="container">
        <div className="menu-intro">
          <SectionTag>Fra disken</SectionTag>
          <h2 className="section-title" id="menu-heading">
            Sortiment
          </h2>
          <p className="menu-intro-text">
            Rugbrød i centrum, wienerbrød og spandauer fra konditoriet, og alt det
            salty og søde der gør en takeaway-frokost komplet. Kom forbi —
            udvalget skifter lidt fra dag til dag.
          </p>
        </div>

        <div className="menu-grid" ref={gridRef}>
          {menuProducts.map((product) => (
            <ProductCard key={product.title} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
