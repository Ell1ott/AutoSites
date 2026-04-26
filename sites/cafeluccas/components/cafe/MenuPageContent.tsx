import { ButtonOutline } from "./ButtonOutline";

function Dish({ number, name, children }: { number: string; name: string; children: string }) {
  return (
    <article className="menu-dish">
      <h3>
        <span className="menu-dish-no">{number}</span> {name}
      </h3>
      <p>{children}</p>
    </article>
  );
}

export function MenuPageContent() {
  return (
    <>
      <header className="menu-hero">
        <img
          src="/menu-hero.png"
          alt="Lækker pizza"
          className="menu-hero-img"
        />
        <div className="menu-hero-content">
          <p className="menu-page-eyebrow">Café Luccas · Sorø</p>
          <h1 id="menu-heading" className="menu-page-title">
            Menukort
          </h1>
          <p className="menu-page-lead">
            Pizza, grill, pasta og salat — lavet på friske råvarer. 
            Nyd maden i vores hyggelige café eller som take away.
          </p>
          <div className="menu-page-cta">
            <ButtonOutline href="tel:+4557834466">57 83 44 66</ButtonOutline>
            <ButtonOutline href="tel:+4540241971">40 24 19 71</ButtonOutline>
          </div>
        </div>
      </header>

      <section className="menu-offer-banner" aria-labelledby="frokost-heading">
        <div className="menu-offer-card">
          <h2 id="frokost-heading" className="menu-offer-title">
            Frokosttilbud
          </h2>
          <p>
            <strong>Hver dag kl. 11.00 – 15.00</strong> giver vi særlig pris på
            tre udvalgte pizzaer: skinke, pepperoni og calzone. <br/>
            Kom forbi eller ring og bestil i god tid.
          </p>
        </div>
      </section>

      <section className="menu-section" aria-labelledby="sandwich-heading">
        <div className="menu-section-header">
          <h2 id="sandwich-heading">Sandwich</h2>
          <p className="menu-section-intro">
            Friske råvarer og hjemmelavet fyld i sprøde surdejs-caféboller.
          </p>
        </div>
        <div className="menu-dishes-grid">
          <Dish number="93" name="Kyllingesandwich">
            Serveret på surdejs-cafébolle med kylling, bacon, kartoffelbåde,
            karrydressing, salatmayonnaise, grøn pesto, iceberg, tomat, agurk,
            rucola og cremefraichedressing.
          </Dish>
        </div>
      </section>

      <section className="menu-section menu-section--peach" aria-labelledby="burger-heading">
        <div className="menu-section-header">
          <h2 id="burger-heading">Burgere</h2>
          <p className="menu-section-intro">
            Komplet menu med 200 g hakket oksekød på surdejs-cafébolle 
            serveret med sprøde kartoffelbåde.
          </p>
        </div>
        <div className="menu-dishes-grid">
          <Dish number="97" name="Græsk burger menu">
            Cheddar, salatmayonnaise, ketchup, iceberg, agurk, ost, bacon og
            kartoffelbåde.
          </Dish>
          <Dish number="98" name="Luccas burger menu">
            Salatmayonnaise, ketchup, iceberg, agurk, ost, bacon og kartoffelbåde.
          </Dish>
          <Dish number="99" name="Mexicansk burger menu">
            Salatmayonnaise, ketchup, jalapeños, guacamole, tacosauce, iceberg,
            agurk og kartoffelbåde.
          </Dish>
        </div>
      </section>

      <section className="menu-section" aria-labelledby="pizza-heading">
        <div className="menu-section-header">
          <h2 id="pizza-heading">Udvalgte Pizzaer</h2>
          <p className="menu-section-intro">
            Et udpluk af vores mest populære varianter. Kontakt os for det fulde menukort.
          </p>
        </div>
        <div className="menu-dishes-grid">
          <Dish number="2" name="Skinkepizza">
            En klassiker med skinke — blandt frokostfavoritterne.
          </Dish>
          <Dish number="3" name="Pepperonipizza">
            Krydret pepperoni — også på frokostmenuen.
          </Dish>
          <Dish number="56" name="Calzone">
            Foldet pizza med fyld — med i frokosttilbuddet.
          </Dish>
        </div>
      </section>

      <section
        className="menu-section menu-section--categories"
        aria-labelledby="kategorier-heading"
      >
        <div className="menu-section-header">
          <h2 id="kategorier-heading">Hele udvalget</h2>
          <p className="menu-section-intro">
            Vi tilbyder et bredt sortiment af retter for enhver smag.
          </p>
        </div>
        
        <div style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
          <ul className="menu-category-list" style={{ listStyle: "none", padding: 0, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "2rem", marginBottom: "3rem" }}>
            <li>Pizzaer</li>
            <li>Burgere</li>
            <li>Pasta</li>
            <li>Salater</li>
            <li>Grillretter</li>
          </ul>
          <p className="menu-section-footnote">
            Har du spørgsmål til allergener eller tilpasninger, er du velkommen til
            at ringe — vi hjælper gerne.
          </p>
          <ButtonOutline href="/#contact">Kontakt &amp; vejvisning</ButtonOutline>
        </div>
      </section>
    </>
  );
}
