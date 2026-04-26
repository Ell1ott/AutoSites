import Image from "next/image";
import { ButtonOutline } from "./ButtonOutline";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=1000";

export function HeroSection() {
  return (
    <section id="home" className="hero" aria-labelledby="hero-heading">
      <div className="hero-content">
        <h1 id="hero-heading">
          pizza
          <br />
          &amp; grill.
        </h1>
        <div
          className="dotted-line"
          style={{ borderColor: "var(--cream)" }}
        />
        <p>
          Midt i Sorø laver vi hjemmelavet mad med masser af kærlighed og friske
          råvarer. Pizza, burgere, pasta, salater og grillretter — spis i caféen
          eller tag maden med hjem.
        </p>
        <ButtonOutline href="/menu" cream>
          Se menuen
        </ButtonOutline>
      </div>
      <div className="hero-img">
        <Image
          src={HERO_IMAGE}
          alt="Varm pizza med ost og friske toppings"
          fill
          sizes="(max-width: 900px) 100vw, 50vw"
          priority
        />
      </div>

      <div className="badge-price">
        <span>11–15</span>
        <span>frokost</span>
      </div>
      <div className="tape-label">
        RING &amp; BESTIL
        <br />
        RING &amp; BESTIL
        <br />
        RING &amp; BESTIL
      </div>
      <div className="diagonal-banner">Familievenlig café · Sorø</div>
    </section>
  );
}
