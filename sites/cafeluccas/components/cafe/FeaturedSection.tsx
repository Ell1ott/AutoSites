import Image from "next/image";
import { ButtonOutline } from "./ButtonOutline";

const FEATURED_IMAGE =
  "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=1000";

export function FeaturedSection() {
  return (
    <section
      id="frokost"
      className="featured"
      aria-labelledby="featured-heading"
    >
      <div className="featured-content">
        <span className="recipe-of-month">Frokosttilbud</span>
        <h2 id="featured-heading">
          tre
          <br />
          favorit
          <br />
          pizzaer.
        </h2>
        <p>
          Hver dag mellem kl. 11 og 15 kan du få særlig pris på skinkepizza,
          pepperonipizza og calzone. Perfekt til en fyldig frokostpause — se
          hele menukortet for detaljer.
        </p>
        <ButtonOutline href="tel:+4557834466">Ring og bestil</ButtonOutline>
      </div>
      <div className="featured-img">
        <Image
          src={FEATURED_IMAGE}
          alt="Burger med ost og salat"
          fill
          sizes="(max-width: 900px) 100vw, 40vw"
        />
      </div>
    </section>
  );
}
