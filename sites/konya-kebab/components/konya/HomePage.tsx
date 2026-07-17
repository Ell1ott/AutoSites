"use client";

import { useEffect, useRef, useState } from "react";

const PHONE_HREF = "tel:+4555778798";
const PHONE_LABEL = "55 77 87 98";
const MAPS_URL =
  "https://maps.google.com/?cid=10937926852505944707&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA";
const MAPS_EMBED =
  "https://maps.google.com/maps?q=55.230760599999996,11.761835699999999&z=16&output=embed";

const MENU_CATS = [
  {
    title: "Pita",
    note: "Alle er med salat, tomat, løg og dressing",
    rows: [
      { name: "Pita kebab", price: "25 kr" },
      { name: "Pita falafel", price: "25 kr" },
      { name: "Pita kylling", price: "30 kr" },
      { name: "Pita mix kebab og kylling", price: "45 kr" },
    ],
  },
  {
    title: "Durum",
    note: "Alle er med salat, tomat, løg og dressing",
    rows: [
      { name: "Durum kebab", price: "35 kr" },
      { name: "Durum falafel", price: "35 kr" },
      { name: "Durum kylling", price: "40 kr" },
      {
        name: "Durum mix kebab og kylling",
        price: "45 kr",
        featured: true,
      },
    ],
  },
  {
    title: "Retter",
    note: "Med salat, tomat, løg og dressing",
    rows: [
      {
        name: "Kebab ret",
        price: "65 kr",
        note: "(m. pommes)",
      },
      {
        name: "Kylling ret",
        price: "75 kr",
        note: "(m. pommes)",
      },
      {
        name: "Falafel ret",
        price: "50 kr",
        note: "(m. hummus)",
      },
      {
        name: "Konya ret",
        price: "65 kr",
        note: "(kebab, falafel, hummus)",
        featured: true,
      },
      { name: "Mix ret kylling og kebab", price: "80 kr" },
    ],
  },
  {
    title: "Burgers",
    note: "Tilbehør: chili, salatmayonnaise, remoulade, ketchup",
    rows: [
      { name: "Big Burger", price: "35 kr" },
      { name: "Cheese Burger", price: "40 kr" },
      { name: "Kylling Burger", price: "40 kr" },
      { name: "Dobb. Big Burger", price: "50 kr" },
      { name: "Dobb. Cheese Burger", price: "55 kr" },
      { name: "Dobb. Kylling Burger", price: "55 kr" },
    ],
  },
  {
    title: "Snacks",
    note: "Tilbehør: chili, salatmayonnaise, remoulade, ketchup",
    rows: [
      { name: "Mozzarella stick (10 stk)", price: "45 kr" },
      { name: "Chilicheesetops (10 stk)", price: "45 kr" },
      { name: "Snack Mix (6+6)", price: "50 kr" },
      { name: "Nuggets (10 stk)", price: "45 kr" },
    ],
  },
  {
    title: "Andet",
    note: "Hurtige tillæg",
    rows: [
      { name: "Kebab box", price: "40 kr", featured: true },
      { name: "Fransk Hotdog", price: "20 kr" },
      { name: "Lille pommes", price: "20 kr" },
      { name: "Stor pommes", price: "25 kr" },
      { name: "Ekstra tilbehør", price: "5 kr" },
    ],
  },
] as const;

const REVIEWS = [
  {
    id: "r1",
    text: "«Ejeren var virkelig flink, næsten ingen ventetid, og maden var seriøst det bedste jeg nogensinde har smagt. Stemningen minder mig om min barndom i Konya i Tyrkiet. Konya Kebab i Næstved er bare helt urealistisk god.»",
    cite: "Google · for 2 måneder siden",
  },
  {
    id: "r2",
    text: "«Jeg elsker maden. Den bedste restaurant i hele Danmark. Jeg elsker Nizamettin. Jeg er gode venner med ejerens søn. Den bedste restaurant i hele verden.»",
    cite: "Google · for 2 måneder siden",
  },
  {
    id: "r3",
    text: "«En nat efter en dejlig aften på Crazy Daisy bestiller jeg en durum … Den falder prompte inden for ca. 45 sekunder — og smager fuldstændig himmelsk. 5 stjerner herfra.»",
    cite: "Google · for 1 år siden",
  },
] as const;

const HOURS = [
  { day: "Mandag", time: "11.00–20.30" },
  { day: "Tirsdag", time: "11.00–20.30" },
  { day: "Onsdag", time: "11.00–20.30" },
  { day: "Torsdag", time: "11.00–20.30" },
  { day: "Fredag", time: "11.00–05.00" },
  { day: "Lørdag", time: "11.00–05.00" },
  { day: "Søndag", time: "11.00–20.30" },
] as const;

/**
 * Pixel-faithful port of design.html
 */
export function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reveals = root.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      reveals.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    reveals.forEach((el, i) => {
      (el as HTMLElement).style.transitionDelay = `${(i % 3) * 80}ms`;
      io.observe(el);
    });

    return () => io.disconnect();
  }, []);

  const closeNav = () => setNavOpen(false);
  const toggleNav = () => setNavOpen((open) => !open);

  return (
    <div ref={rootRef}>
      <div className="grain" aria-hidden="true" />

      <header className={`nav${scrolled ? " is-scrolled" : ""}`} id="nav">
        <a href="#top" className="nav-brand" onClick={closeNav}>
          Konya <span>Kebab</span>
        </a>
        <nav className="nav-links" aria-label="Primær">
          <a href="#menu">Menu</a>
          <a href="#story">Om os</a>
          <a href="#reviews">Anmeldelser</a>
          <a href="#visit">Find os</a>
        </nav>
        <a className="nav-cta" href={PHONE_HREF}>
          Ring {PHONE_LABEL}
        </a>
        <button
          className="nav-toggle"
          type="button"
          aria-label={navOpen ? "Luk menu" : "Åbn menu"}
          aria-expanded={navOpen}
          id="navToggle"
          onClick={toggleNav}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <div
        className={`nav-mobile${navOpen ? " is-open" : ""}`}
        id="navMobile"
        hidden={!navOpen}
      >
        <a href="#menu" onClick={closeNav}>
          Menu
        </a>
        <a href="#story" onClick={closeNav}>
          Om os
        </a>
        <a href="#reviews" onClick={closeNav}>
          Anmeldelser
        </a>
        <a href="#visit" onClick={closeNav}>
          Find os
        </a>
        <a href={PHONE_HREF} onClick={closeNav}>
          Ring {PHONE_LABEL}
        </a>
      </div>

      <main id="top">
        <section className="hero" aria-label="Hero">
          <div className="hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=2000&q=80"
              alt="Grillspyd over åben ild hos Konya Kebab"
              width={2000}
              height={1333}
              fetchPriority="high"
            />
          </div>
          <div className="hero-content">
            <h1 className="hero-brand">
              Konya<em>Kebab</em>
            </h1>
            <p className="hero-lead">
              Tyrkisk restaurant i Næstved — kebab, durum og grillmad med smag
              af Konya. Hurtig service, ægte ild.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href={PHONE_HREF}>
                Bestil på {PHONE_LABEL}
              </a>
              <a className="btn btn-ghost" href="#visit">
                Ramsherred 25
              </a>
            </div>
          </div>
        </section>

        <section className="menu" id="menu">
          <div className="wrap">
            <div className="menu-head reveal">
              <div>
                <p className="section-label">Menu</p>
                <h2 className="section-title">Priser fra grillen</h2>
                <p className="section-copy">
                  Pita, durum, retter, burgers og snacks — med salat, tomat, løg
                  og dressing. Tilbehør: chili, salatmayonnaise, remoulade og
                  ketchup.
                </p>
              </div>
              <a className="btn btn-ghost" href={PHONE_HREF}>
                Bestil på telefon
              </a>
            </div>

            <div className="menu-featured reveal">
              <div className="menu-featured-copy">
                <p className="menu-tag">Populær</p>
                <h3>Kebab box</h3>
                <p>
                  Kebab, pommes frites, salat, tomat, løg og dressing — klar til
                  at tage med.
                </p>
                <p className="menu-featured-price">40 kr</p>
              </div>
              <div className="menu-featured-visual">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/Noodle-Box-Banner004.webp"
                  alt="Kebab box med kebab og pommes"
                  width={1200}
                  height={675}
                  loading="lazy"
                />
              </div>
            </div>

            <div className="menu-cats">
              {MENU_CATS.map((cat) => (
                <div className="menu-cat reveal" key={cat.title}>
                  <h3>{cat.title}</h3>
                  <p className="menu-cat-note">{cat.note}</p>
                  {cat.rows.map((row) => (
                    <div
                      className={`menu-row${"featured" in row && row.featured ? " is-featured" : ""}`}
                      key={row.name}
                    >
                      <span>
                        {row.name}
                        {"note" in row && row.note ? (
                          <>
                            {" "}
                            <small style={{ color: "var(--smoke)" }}>
                              {row.note}
                            </small>
                          </>
                        ) : null}
                      </span>
                      <span className="menu-price">{row.price}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="story" id="story">
          <div className="wrap story-grid">
            <div className="story-visual reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=1200&q=80"
                alt="Krydret kød på grillspyd"
                width={1200}
                height={1500}
                loading="lazy"
              />
            </div>
            <div className="story-body reveal">
              <p className="section-label">Om os</p>
              <h2 className="section-title">
                Smagen af Konya — midt i Næstved
              </h2>
              <p className="section-copy">
                Konya Kebab er en tyrkisk restaurant på Ramsherred. Gæster
                beskriver stemningen som barndom i Konya — og maden som noget,
                man husker længe efter.
              </p>
              <p className="section-copy">
                Ejeren tager imod med et smil, ventetiden er kort, og Nizamettin
                sørger for, at grillen kører. Fra hurtig durum til en rigtig
                grillret: det er casual, ægte og bygget til sultne mennesker.
              </p>
              <div className="story-stats">
                <div>
                  <strong>4,3</strong>
                  <span>Google-rating</span>
                </div>
                <div>
                  <strong>342</strong>
                  <span>Anmeldelser</span>
                </div>
                <div>
                  <strong>05.00</strong>
                  <span>Åbent fre–lør</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="experience" id="order">
          <div className="wrap">
            <div className="reveal">
              <p className="section-label">Sådan gør du</p>
              <h2 className="section-title">Sulten? Tre skridt.</h2>
              <p className="section-copy">
                Kom forbi, ring inden, eller tag det med — vi er hurtige, så du
                slipper for at vente sulten.
              </p>
            </div>
            <div className="exp-grid">
              <div className="exp-step reveal">
                <div className="exp-num" aria-hidden="true">
                  01
                </div>
                <h3>Vælg din ret</h3>
                <p>
                  Durum, kebab eller grill — og sig til om kød, salat og pommes.
                  Vi tilpasser ordren.
                </p>
              </div>
              <div className="exp-step reveal">
                <div className="exp-num" aria-hidden="true">
                  02
                </div>
                <h3>Vi tænder grillen</h3>
                <p>
                  Ordren går direkte på. Gæster nævner ofte næsten ingen
                  ventetid — og det holder vi fast i.
                </p>
              </div>
              <div className="exp-step reveal">
                <div className="exp-num" aria-hidden="true">
                  03
                </div>
                <h3>Spis her eller tag med</h3>
                <p>
                  Spis på stedet, eller tag det varmt med. Ramsherred 25, midt i
                  Næstved.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="reviews" id="reviews">
          <div className="wrap">
            <div className="reviews-head reveal">
              <div className="rating-pill">
                <strong>4,3</strong>
                <span className="rating-stars" aria-hidden="true">
                  ★★★★☆
                </span>
                <span>342 Google-anmeldelser</span>
              </div>
              <p className="section-label">Hvad gæsterne siger</p>
              <h2 className="section-title">Tillid fra Næstved</h2>
              <p className="section-copy">
                Flinke ejere, kort ventetid og mad med smag af Konya — det går
                igen i anmeldelserne.
              </p>
            </div>

            <div className="reviews-grid">
              {REVIEWS.map((review) => (
                <article className="review-card reveal" key={review.id}>
                  <p className="review-stars" aria-label="5 ud af 5">
                    ★★★★★
                  </p>
                  <blockquote>{review.text}</blockquote>
                  <cite>{review.cite}</cite>
                </article>
              ))}
            </div>

            <div className="reviews-link reveal">
              <a
                className="btn btn-ghost"
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Se alle anmeldelser på Google Maps
              </a>
            </div>
          </div>
        </section>

        <section className="visit" id="visit">
          <div className="wrap">
            <div className="reveal" style={{ marginBottom: "2.5rem" }}>
              <p className="section-label">Find os</p>
              <h2 className="section-title">Kom sulten forbi</h2>
              <p className="section-copy">
                Ramsherred 25, 4700 Næstved — tyrkisk restaurant midt i byen.
              </p>
            </div>

            <div className="visit-panel reveal">
              <div className="visit-map">
                <iframe
                  title="Konya Kebab på Google Maps"
                  src={MAPS_EMBED}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
              <div className="visit-info">
                <div className="visit-block">
                  <h3>Adresse</h3>
                  <p>
                    Ramsherred 25
                    <br />
                    4700 Næstved
                  </p>
                  <p style={{ marginTop: "0.5rem" }}>
                    <a
                      href={MAPS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Åbn i Google Maps
                    </a>
                  </p>
                </div>
                <div className="visit-block">
                  <h3>Kontakt</h3>
                  <p>
                    <a href={PHONE_HREF}>{PHONE_LABEL}</a>
                    <br />
                    <a href={PHONE_HREF}>+45 55 77 87 98</a>
                  </p>
                </div>
                <div className="visit-block">
                  <h3>Åbningstider</h3>
                  {HOURS.map((row) => (
                    <div className="hours-row" key={row.day}>
                      <span>{row.day}</span>
                      <strong>{row.time}</strong>
                    </div>
                  ))}
                </div>
                <div className="visit-actions">
                  <a className="btn btn-primary" href={PHONE_HREF}>
                    Ring {PHONE_LABEL}
                  </a>
                  <a
                    className="btn btn-ghost"
                    href={MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Maps
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <div className="footer-brand">
              Konya <span>Kebab</span>
            </div>
            <p className="footer-meta">
              Tyrkisk restaurant · Ramsherred 25, 4700 Næstved
              <br />© 2026 Konya Kebab · 4,3/5 på Google (342 anmeldelser)
            </p>
          </div>
          <div className="footer-social">
            <a href={PHONE_HREF}>{PHONE_LABEL}</a>
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">
              Google Maps
            </a>
            <a href="#menu">Menu</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
