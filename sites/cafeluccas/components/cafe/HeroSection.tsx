import Image from "next/image";
import { ButtonOutline } from "./ButtonOutline";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=1000";

export function HeroSection() {
  return (
    <section id="home" className="hero" aria-labelledby="hero-heading">
      <div className="hero-content">
        <h1 id="hero-heading">
          sourdough
          <br />
          pizza.
        </h1>
        <div
          className="dotted-line"
          style={{ borderColor: "var(--cream)" }}
        />
        <p>
          From our stone kiln to your table. Naturally leavened, locally
          sourced, and crafted with the obsessive precision of a Scandinavian
          winter.
        </p>
        <ButtonOutline href="#menu" cream>
          View Menu
        </ButtonOutline>
      </div>
      <div className="hero-img">
        <Image
          src={HERO_IMAGE}
          alt="Wood-fired sourdough pizza fresh from the oven"
          fill
          sizes="(max-width: 900px) 100vw, 50vw"
          priority
        />
      </div>

      <div className="badge-price">
        <span>$14</span>
        <span>all pizzas</span>
      </div>
      <div className="tape-label">
        THE BIG CHILL
        <br />
        THE BIG CHILL
        <br />
        THE BIG CHILL
      </div>
      <div className="diagonal-banner">Best in the North</div>
    </section>
  );
}
