import { EditableLink, EditableText } from "@autosites/cms/components";

async function MenuDish({
  numberKey,
  nameKey,
  bodyKey,
  number,
  name,
  body,
}: {
  numberKey: string;
  nameKey: string;
  bodyKey: string;
  number: string;
  name: string;
  body: string;
}) {
  return (
    <article className="menu-dish" style={{ marginBottom: "24px" }}>
      <h3 style={{ fontSize: "20px" }}>
        <span className="menu-dish-no">
          <EditableText cmsKey={numberKey} fallback={number} as="span" />.
        </span>{" "}
        <EditableText cmsKey={nameKey} fallback={name} as="span" />
      </h3>
      <p style={{ fontSize: "16px" }}>
        <EditableText cmsKey={bodyKey} fallback={body} as="span" />
      </p>
    </article>
  );
}

export async function MenuPageContent() {
  return (
    <>
      <header className="menu-page-header">
        <div className="hero-content" style={{ padding: 0 }}>
          <EditableText
            cmsKey="menu.header.eyebrow"
            fallback="Café Luccas · Sorø"
            as="p"
            className="menu-page-eyebrow"
          />
          <h1 id="menu-heading" className="menu-page-title">
            <EditableText
              cmsKey="menu.header.title"
              fallback="menu<br />kort."
              as="span"
            />
          </h1>
          <div
            className="dotted-line"
            style={{
              borderColor: "var(--cream)",
              width: "100px",
              marginBottom: "32px",
            }}
          />
          <EditableText
            cmsKey="menu.header.lead"
            fallback="Pizza, grill, pasta og salat — lavet på friske råvarer. Spis hos os (op til 34 gæster) eller bestil take away: ring, så er maden klar til afhentning."
            as="p"
            className="menu-page-lead"
          />
          <div className="menu-page-cta">
            <EditableLink
              cmsKey="menu.header.phonePrimary"
              fallback={{ href: "tel:+4557834466", label: "57 83 44 66" }}
              className="btn-outline"
              style={{ borderColor: "var(--cream)", color: "var(--cream)" }}
            />
            <EditableLink
              cmsKey="menu.header.phoneSecondary"
              fallback={{ href: "tel:+4540241971", label: "40 24 19 71" }}
              className="btn-outline"
              style={{ borderColor: "var(--cream)", color: "var(--cream)" }}
            />
          </div>
        </div>
        <div className="badge-price">
          <EditableText cmsKey="menu.header.badgeTime" fallback="11–22" as="span" />
          <EditableText cmsKey="menu.header.badgeLabel" fallback="åben" as="span" />
        </div>
        <div className="tape-label">
          <EditableText
            cmsKey="menu.header.tape"
            fallback="LOCAL FOOD<br />LOCAL FOOD<br />LOCAL FOOD"
            as="span"
          />
        </div>
      </header>

      <div
        className="menu-page-grid-container"
        style={{ borderBottom: "var(--border)" }}
      >
        <section
          className="menu-offer-banner"
          aria-labelledby="frokost-heading"
          style={{ borderBottom: "var(--border)", height: "100%" }}
        >
          <h2 id="frokost-heading" className="menu-offer-title">
            <EditableText
              cmsKey="menu.frokost.title"
              fallback="frokost<br />tilbud."
              as="span"
            />
          </h2>
          <div
            className="dotted-line"
            style={{ width: "60px", marginBottom: "24px" }}
          />
          <p>
            <EditableText
              cmsKey="menu.frokost.body"
              fallback="<strong>Hver dag kl. 11.00 – 15.00</strong> giver vi særlig pris på tre udvalgte pizzaer: skinke, pepperoni og calzone. <br/>Kom forbi eller ring og bestil i god tid."
              as="span"
            />
          </p>
          <div
            className="diagonal-banner"
            style={{ bottom: "20px", right: "40px" }}
          >
            <EditableText
              cmsKey="menu.frokost.priceBanner"
              fallback="Kun 65,- kr."
              as="span"
            />
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
            borderBottom: "var(--border)",
          }}
        >
          <section
            className="menu-section"
            aria-labelledby="sandwich-heading"
            style={{ borderBottom: "none", borderRight: "var(--border)" }}
          >
            <EditableText
              cmsKey="menu.sandwich.label"
              fallback="friske"
              as="h4"
              className="split-label"
            />
            <h2 id="sandwich-heading" style={{ fontSize: "42px" }}>
              <EditableText
                cmsKey="menu.sandwich.title"
                fallback="sandwich."
                as="span"
              />
            </h2>
            <div
              className="dotted-line"
              style={{ width: "80px", marginBottom: "40px" }}
            />
            <MenuDish
              numberKey="menu.dish.93.no"
              nameKey="menu.dish.93.name"
              bodyKey="menu.dish.93.body"
              number="93"
              name="Kyllingesandwich"
              body="Serveret på surdejs-cafébolle med kylling, bacon, kartoffelbåde, karrydressing, salatmayonnaise, grøn pesto, iceberg, tomat, agurk, rucola og cremefraichedressing."
            />
          </section>

          <section
            className="menu-section menu-section--peach"
            aria-labelledby="burger-heading"
            style={{ borderBottom: "none" }}
          >
            <EditableText
              cmsKey="menu.burger.label"
              fallback="saftige"
              as="h4"
              className="split-label"
            />
            <h2 id="burger-heading" style={{ fontSize: "42px" }}>
              <EditableText
                cmsKey="menu.burger.title"
                fallback="burgere."
                as="span"
              />
            </h2>
            <div
              className="dotted-line"
              style={{ width: "80px", marginBottom: "40px" }}
            />
            <EditableText
              cmsKey="menu.burger.intro"
              fallback="200 g hakket oksekød på surdejs-cafébolle serveret som komplet menu."
              as="p"
              className="menu-section-intro"
              style={{ fontSize: "16px" }}
            />
            <div style={{ display: "grid", gap: "10px" }}>
              <MenuDish
                numberKey="menu.dish.97.no"
                nameKey="menu.dish.97.name"
                bodyKey="menu.dish.97.body"
                number="97"
                name="Græsk burger menu"
                body="Cheddar, salatmayonnaise, ketchup, iceberg, agurk, ost, bacon og kartoffelbåde."
              />
              <MenuDish
                numberKey="menu.dish.98.no"
                nameKey="menu.dish.98.name"
                bodyKey="menu.dish.98.body"
                number="98"
                name="Luccas burger menu"
                body="Salatmayonnaise, ketchup, iceberg, agurk, ost, bacon og kartoffelbåde."
              />
              <MenuDish
                numberKey="menu.dish.99.no"
                nameKey="menu.dish.99.name"
                bodyKey="menu.dish.99.body"
                number="99"
                name="Mexicansk burger menu"
                body="Salatmayonnaise, ketch., jalapeños, guac., tacosauce, iceberg, agurk og kartoffelbåde."
              />
            </div>
          </section>
        </div>

        <section
          className="menu-section"
          aria-labelledby="pizza-heading"
          style={{ backgroundColor: "var(--mint)", borderBottom: "none" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: "40px",
            }}
          >
            <div>
              <EditableText
                cmsKey="menu.pizza.label"
                fallback="klassiske"
                as="h4"
                className="split-label"
              />
              <h2 id="pizza-heading" style={{ color: "var(--dark)" }}>
                <EditableText
                  cmsKey="menu.pizza.title"
                  fallback="pizzaer."
                  as="span"
                />
              </h2>
              <div
                className="dotted-line"
                style={{ width: "80px", marginBottom: "40px" }}
              />
              <EditableText
                cmsKey="menu.pizza.intro"
                fallback="Vores mest populære pizzaer fra frokostmenuen."
                as="p"
                className="menu-section-intro"
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                }}
              >
                <MenuDish
                  numberKey="menu.dish.2.no"
                  nameKey="menu.dish.2.name"
                  bodyKey="menu.dish.2.body"
                  number="2"
                  name="Skinkepizza"
                  body="En klassiker med skinke."
                />
                <MenuDish
                  numberKey="menu.dish.3.no"
                  nameKey="menu.dish.3.name"
                  bodyKey="menu.dish.3.body"
                  number="3"
                  name="Pepperonipizza"
                  body="Krydret pepperoni."
                />
                <MenuDish
                  numberKey="menu.dish.56.no"
                  nameKey="menu.dish.56.name"
                  bodyKey="menu.dish.56.body"
                  number="56"
                  name="Calzone"
                  body="Foldet pizza med fyld."
                />
              </div>
            </div>
            <div
              style={{
                backgroundColor: "var(--cream)",
                border: "var(--border)",
                padding: "40px",
                position: "relative",
              }}
            >
              <div className="tape-label tape-label--pizza-info">
                <EditableText
                  cmsKey="menu.pizza.takeawayTape"
                  fallback="TAKE AWAY"
                  as="span"
                />
              </div>
              <EditableText
                cmsKey="menu.pizza.infoLabel"
                fallback="Info"
                as="h4"
                className="split-label"
              />
              <EditableText
                cmsKey="menu.pizza.infoBody"
                fallback="Ud over retterne her på siden finder du mange andre varianter i caféen. Vi tilbyder også pasta, salater og grillretter. <br/><br/>Ring til os for at høre om dagens udvalg!"
                as="p"
                style={{ marginTop: "20px", fontSize: "16px", lineHeight: "1.6" }}
              />
              <div
                className="dotted-line"
                style={{ borderStyle: "dotted", margin: "20px 0" }}
              />
              <EditableLink
                cmsKey="menu.pizza.orderCta"
                fallback={{
                  href: "tel:+4557834466",
                  label: "Bestil nu: 57 83 44 66",
                }}
                className="btn-outline"
              />
            </div>
          </div>
        </section>
      </div>

      <section
        className="menu-section"
        aria-labelledby="kategorier-heading"
        style={{
          borderBottom: "none",
          backgroundColor: "var(--dark)",
          color: "var(--cream)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "40px",
          }}
        >
          <h2
            id="kategorier-heading"
            style={{ color: "var(--cream)", marginBottom: 0 }}
          >
            <EditableText
              cmsKey="menu.categories.heading"
              fallback="hele<br />udvalget."
              as="span"
            />
          </h2>
          <div
            className="tape-label"
            style={{
              position: "relative",
              top: "0",
              right: "0",
              background: "var(--coral)",
            }}
          >
            <EditableText
              cmsKey="menu.categories.tape"
              fallback="VELBEKOMME"
              as="span"
            />
          </div>
        </div>

        <ul
          className="menu-category-list"
          style={{
            listStyle: "none",
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "20px",
          }}
        >
          <li
            style={{
              border: "2px solid var(--cream)",
              padding: "24px",
              fontWeight: "800",
              fontSize: "20px",
            }}
          >
            <EditableText
              cmsKey="menu.categories.pizza"
              fallback="PIZZAER"
              as="span"
            />
          </li>
          <li
            style={{
              border: "2px solid var(--cream)",
              padding: "24px",
              fontWeight: "800",
              fontSize: "20px",
            }}
          >
            <EditableText
              cmsKey="menu.categories.burger"
              fallback="BURGERE"
              as="span"
            />
          </li>
          <li
            style={{
              border: "2px solid var(--cream)",
              padding: "24px",
              fontWeight: "800",
              fontSize: "20px",
            }}
          >
            <EditableText
              cmsKey="menu.categories.pasta"
              fallback="PASTA"
              as="span"
            />
          </li>
          <li
            style={{
              border: "2px solid var(--cream)",
              padding: "24px",
              fontWeight: "800",
              fontSize: "20px",
            }}
          >
            <EditableText
              cmsKey="menu.categories.salad"
              fallback="SALATER"
              as="span"
            />
          </li>
          <li
            style={{
              border: "2px solid var(--cream)",
              padding: "24px",
              fontWeight: "800",
              fontSize: "20px",
            }}
          >
            <EditableText
              cmsKey="menu.categories.grill"
              fallback="GRILLRETTER"
              as="span"
            />
          </li>
        </ul>

        <div
          style={{
            marginTop: "60px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "40px",
            alignItems: "center",
          }}
        >
          <EditableText
            cmsKey="menu.footer.note"
            fallback="Har du spørgsmål til allergener eller tilpasninger, er du velkommen til at ringe — vi hjælper gerne."
            as="p"
            className="menu-section-footnote"
            style={{ marginBottom: 0 }}
          />
          <div style={{ textAlign: "right" }}>
            <EditableLink
              cmsKey="menu.footer.contactCta"
              fallback={{ href: "/#contact", label: "Kontakt & vejvisning" }}
              className="btn-outline"
              style={{ borderColor: "var(--cream)", color: "var(--cream)" }}
            />
          </div>
        </div>
      </section>
    </>
  );
}
