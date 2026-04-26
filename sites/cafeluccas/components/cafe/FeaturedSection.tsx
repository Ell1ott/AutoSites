import Image from "next/image";
import { ButtonOutline } from "./ButtonOutline";

const FEATURED_IMAGE =
  "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=1000";

export function FeaturedSection() {
  return (
    <section id="bookings" className="featured" aria-labelledby="featured-heading">
      <div className="featured-content">
        <span className="recipe-of-month">recipe of the month</span>
        <h2 id="featured-heading">
          smash
          <br />
          &amp;
          <br />
          grab.
        </h2>
        <p>
          Our signature double-patty smash burger with fermented pickles and
          Swedish cheddar. It&apos;s a mess, but it&apos;s our mess.
        </p>
        <ButtonOutline href="tel:+4520304050">Order for Pickup</ButtonOutline>
      </div>
      <div className="featured-img">
        <Image
          src={FEATURED_IMAGE}
          alt="Smash burger with melted cheese and pickles"
          fill
          sizes="(max-width: 900px) 100vw, 40vw"
        />
      </div>
    </section>
  );
}
