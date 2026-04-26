import { ButtonOutline } from "./ButtonOutline";

export function SplitSection() {
  return (
    <section className="split-section" id="about" aria-label="Om Café Luccas">
      <div className="split-box">
        <h4 className="split-label">Om os</h4>
        <p className="split-about-text">
          Café Luccas ligger centralt i hjertet af Sorø. Vi er en
          familievenlig pizza- og grillrestaurant med fokus på hjemmelavet mad,
          hygge og smag — uanset om du sætter dig ved et bord eller bestiller
          take away.
        </p>
        <h4 className="split-label split-label-spaced">Åbningstider</h4>
        <p className="split-hours-text">
          Alle dage: 11.00 – 22.00
        </p>
        <p className="split-capacity">
          Siddepladser i caféen: op til <strong>34 gæster</strong>.
        </p>
        <ButtonOutline href="/menu" className="split-menu-link">
          Gå til menuen
        </ButtonOutline>
      </div>
      <div
        className="split-box split-newsletter"
        style={{ backgroundColor: "var(--blue)", color: "white" }}
      >
        <h4 className="split-label">Take away</h4>
        <p className="split-newsletter-copy">
          Ring og bestil — så gør vi maden klar til afhentning, når det passer
          dig.
        </p>
        <p className="split-phone-block">
          <a href="tel:+4557834466" className="split-phone-link">
            57 83 44 66
          </a>
          <br />
          <a href="tel:+4540241971" className="split-phone-link">
            40 24 19 71
          </a>
        </p>
        <ButtonOutline
          href="https://www.google.com/maps/search/?api=1&query=Storgade+38,+4180+Sor%C3%B8"
          className="split-maps-btn"
          style={{ borderColor: "white", color: "white" }}
          target="_blank"
          rel="noopener noreferrer"
        >
          Åbn i Google Maps
        </ButtonOutline>
      </div>
    </section>
  );
}
