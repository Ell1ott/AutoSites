import Link from "next/link";
import { SectionLabel } from "./SectionLabel";

export function TakeawaySection() {
  return (
    <div className="takeaway-section">
      <SectionLabel title="Takeaway" meta="Bestil mad med hjem · samme menu som på spiseriet" />
      <div className="takeaway-copy">
        <p className="takeaway-lede">Velkommen til — også i takeaway-version.</p>
        <p className="takeaway-body">
          Vi laver både buffet (på restauranten), a la carte og takeaway. Takeaway-priserne følger menukortet på{" "}
          <Link href="https://kinabuffet.com/">kinabuffet.com</Link>. Ring gerne på{" "}
          <a href="tel:+4597181888">97 18 18 88</a> ved spørgsmål eller større bestillinger.
        </p>
        <p className="takeaway-note">
          <strong>Vegetarisk:</strong> vegetar-suppe (nr. 6) og flere grøntsagsbaserede retter findes på menukortet —
          spørg personalet, hvis du vil høre dagens muligheder.
        </p>
        <p className="takeaway-cta">
          <Link href="/menu" className="takeaway-btn">
            Se buffet &amp; menukort
          </Link>
        </p>
      </div>
    </div>
  );
}
