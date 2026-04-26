import { ButtonOutline } from "./ButtonOutline";

function Dish({ number, name, children }: { number: string; name: string; children: string }) {
  return (
    <article className="menu-dish" style={{ marginBottom: "24px" }}>
      <h3 style={{ fontSize: "20px" }}>
        <span className="menu-dish-no">{number}.</span> {name}
      </h3>
      <p style={{ fontSize: "16px" }}>{children}</p>
    </article>
  );
}

export function MenuPageContent() {
  return (
    <>
      <header className="menu-page-header">
        <div className="hero-content" style={{ padding: 0 }}>
          <p className="menu-page-eyebrow">Café Luccas · Sorø</p>
          <h1 id="menu-heading" className="menu-page-title">
            menu<br/>kort.
          </h1>
          <div
            className="dotted-line"
            style={{ borderColor: "var(--cream)", width: "100px", marginBottom: "32px" }}
          />
          <p className="menu-page-lead">
            Pizza, grill, pasta og salat — lavet på friske råvarer. Spis hos os
            (op til 34 gæster) eller bestil take away: ring, så er maden klar til
            afhentning.
          </p>
          <div className="menu-page-cta">
            <ButtonOutline href="tel:+4557834466" cream>57 83 44 66</ButtonOutline>
            <ButtonOutline href="tel:+4540241971" cream>40 24 19 71</ButtonOutline>
          </div>
        </div>
        <div className="badge-price" style={{ top: "40px", right: "10%" }}>
          <span>11–22</span>
          <span>åben</span>
        </div>
        <div className="tape-label" style={{ top: "200px", right: "-10px" }}>
          LOCAL FOOD
          <br />
          LOCAL FOOD
          <br />
          LOCAL FOOD
        </div>
      </header>

      {/* Grid Layout Starts Here */}
      <div className="menu-page-grid-container" style={{ borderBottom: "var(--border)" }}>
        
        {/* Frokosttilbud - Highlighted */}
        <section className="menu-offer-banner" aria-labelledby="frokost-heading" style={{ borderBottom: "var(--border)", height: "100%" }}>
          <h2 id="frokost-heading" className="menu-offer-title">
            frokost<br/>tilbud.
          </h2>
          <div className="dotted-line" style={{ width: "60px", marginBottom: "24px" }} />
          <p>
            <strong>Hver dag kl. 11.00 – 15.00</strong> giver vi særlig pris på
            tre udvalgte pizzaer: skinke, pepperoni og calzone. <br/>
            Kom forbi eller ring og bestil i god tid.
          </p>
          <div className="diagonal-banner" style={{ bottom: "20px", right: "40px" }}>Kun 65,- kr.</div>
        </section>

        {/* Multi-column Grid for main categories */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", borderBottom: "var(--border)" }}>
          
          <section className="menu-section" aria-labelledby="sandwich-heading" style={{ borderBottom: "none", borderRight: "var(--border)" }}>
             <h4 className="split-label">friske</h4>
             <h2 id="sandwich-heading" style={{ fontSize: "42px" }}>sandwich.</h2>
             <div className="dotted-line" style={{ width: "80px", marginBottom: "40px" }} />
             <Dish number="93" name="Kyllingesandwich">
                Serveret på surdejs-cafébolle med kylling, bacon, kartoffelbåde,
                karrydressing, salatmayonnaise, grøn pesto, iceberg, tomat, agurk,
                rucola og cremefraichedressing.
             </Dish>
          </section>

          <section className="menu-section menu-section--peach" aria-labelledby="burger-heading" style={{ borderBottom: "none" }}>
            <h4 className="split-label">saftige</h4>
            <h2 id="burger-heading" style={{ fontSize: "42px" }}>burgere.</h2>
            <div className="dotted-line" style={{ width: "80px", marginBottom: "40px" }} />
            <p className="menu-section-intro" style={{ fontSize: "16px" }}>
              200 g hakket oksekød på surdejs-cafébolle serveret som komplet menu.
            </p>
            <div style={{ display: "grid", gap: "10px" }}>
              <Dish number="97" name="Græsk burger menu">
                Cheddar, salatmayonnaise, ketchup, iceberg, agurk, ost, bacon og kartoffelbåde.
              </Dish>
              <Dish number="98" name="Luccas burger menu">
                Salatmayonnaise, ketchup, iceberg, agurk, ost, bacon og kartoffelbåde.
              </Dish>
              <Dish number="99" name="Mexicansk burger menu">
                Salatmayonnaise, ketch., jalapeños, guac., tacosauce, iceberg, agurk og kartoffelbåde.
              </Dish>
            </div>
          </section>

        </div>

        {/* Large Format Pizza Section */}
        <section className="menu-section" aria-labelledby="pizza-heading" style={{ backgroundColor: "var(--mint)", borderBottom: "none" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "40px" }}>
            <div>
              <h4 className="split-label">klassiske</h4>
              <h2 id="pizza-heading" style={{ color: "var(--dark)" }}>pizzaer.</h2>
              <div className="dotted-line" style={{ width: "80px", marginBottom: "40px" }} />
              <p className="menu-section-intro">
                Vores mest populære pizzaer fra frokostmenuen.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <Dish number="2" name="Skinkepizza">
                  En klassiker med skinke.
                </Dish>
                <Dish number="3" name="Pepperonipizza">
                  Krydret pepperoni.
                </Dish>
                <Dish number="56" name="Calzone">
                  Foldet pizza med fyld.
                </Dish>
              </div>
            </div>
            <div style={{ backgroundColor: "var(--cream)", border: "var(--border)", padding: "40px", position: "relative" }}>
                 <div className="tape-label" style={{ position: "absolute", top: "-10px", right: "-10px", transform: "rotate(2deg)" }}>TAKE AWAY</div>
                 <h4 className="split-label">Info</h4>
                 <p style={{ marginTop: "20px", fontSize: "16px", lineHeight: "1.6" }}>
                   Ud over retterne her på siden finder du mange andre varianter i caféen. Vi tilbyder også pasta, salater og grillretter. <br/><br/>
                   Ring til os for at høre om dagens udvalg!
                 </p>
                 <div className="dotted-line" style={{ borderStyle: "dotted", margin: "20px 0" }} />
                 <ButtonOutline href="tel:+4557834466">Bestil nu: 57 83 44 66</ButtonOutline>
            </div>
          </div>
        </section>

      </div>

      <section
        className="menu-section"
        aria-labelledby="kategorier-heading"
        style={{ borderBottom: "none", backgroundColor: "var(--dark)", color: "var(--cream)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px" }}>
          <h2 id="kategorier-heading" style={{ color: "var(--cream)", marginBottom: 0 }}>hele<br/>udvalget.</h2>
          <div className="tape-label" style={{ position: "relative", top: "0", right: "0", background: "var(--coral)" }}>VELBEKOMME</div>
        </div>
        
        <ul className="menu-category-list" style={{ listStyle: "none", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "20px" }}>
          <li style={{ border: "2px solid var(--cream)", padding: "24px", fontWeight: "800", fontSize: "20px" }}>PIZZAER</li>
          <li style={{ border: "2px solid var(--cream)", padding: "24px", fontWeight: "800", fontSize: "20px" }}>BURGERE</li>
          <li style={{ border: "2px solid var(--cream)", padding: "24px", fontWeight: "800", fontSize: "20px" }}>PASTA</li>
          <li style={{ border: "2px solid var(--cream)", padding: "24px", fontWeight: "800", fontSize: "20px" }}>SALATER</li>
          <li style={{ border: "2px solid var(--cream)", padding: "24px", fontWeight: "800", fontSize: "20px" }}>GRILLRETTER</li>
        </ul>
        
        <div style={{ marginTop: "60px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "center" }}>
           <p className="menu-section-footnote" style={{ marginBottom: 0 }}>
            Har du spørgsmål til allergener eller tilpasninger, er du velkommen til
            at ringe — vi hjælper gerne.
          </p>
          <div style={{ textAlign: "right" }}>
            <ButtonOutline href="/#contact" cream>Kontakt &amp; vejvisning</ButtonOutline>
          </div>
        </div>
      </section>
    </>
  );
}
