import { SectionTag } from "./SectionTag";

export function OrderSection() {
  return (
    <section className="section-order" id="bestil" aria-labelledby="order-heading">
      <div className="container">
        <div className="order-card">
          <SectionTag>Bestilling</SectionTag>
          <h3 className="section-title order-title" id="order-heading">
            Skal vi gemme et brød til dig?
          </h3>
          <p>
            Vi bager i begrænsede partier hver dag. Reserver dit bagværk før
            kl. 20:00 dagen før.
          </p>
          <a href="mailto:hej@bachsbageri.dk?subject=Reservation%20af%20bagværk" className="btn-primary">
            Gå til bestilling
          </a>
        </div>
      </div>
    </section>
  );
}
