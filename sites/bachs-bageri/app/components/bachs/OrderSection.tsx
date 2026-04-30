import { SectionTag } from "./SectionTag";

const MAIL = "bachsbageritarm@gmail.com";

export function OrderSection() {
  return (
    <section
      className="section-order"
      id="bestil"
      aria-labelledby="order-heading"
    >
      <div className="container">
        <div className="order-card">
          <SectionTag>Bestilling</SectionTag>
          <h3 className="section-title order-title" id="order-heading">
            Ring eller skriv — så hjælper vi dig
          </h3>
          <p>
            Skal du bruge noget bestemt til et selskab, mange sandwich eller en
            kage på et tidspunkt? Kontakt os gerne i god tid, så vi kan sige ja
            til det, du drømmer om.
          </p>
          <div className="order-actions">
            <a href={`mailto:${MAIL}?subject=Forespørgsel%20fra%20websitet`} className="btn-primary">
              Send en mail
            </a>
            <a href="tel:+4597371032" className="btn-secondary">
              Ring til bageren
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
