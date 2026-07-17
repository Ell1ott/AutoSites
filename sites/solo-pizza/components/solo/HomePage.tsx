"use client";

import { useEffect, useRef, useState } from "react";

const WOLT_URL =
  "https://wolt.com/da/dnk/naestved/restaurant/solo-pizza-nstved";
const MAPS_URL = "https://maps.google.com/?cid=12910759397491766037";
const MAPS_EMBED =
  "https://maps.google.com/maps?q=Solo+Pizza,+Næstved+Storcenter+39b,+4700+Næstved&cid=12910759397491766037&z=16&output=embed";
const FACEBOOK_URL =
  "https://www.facebook.com/profile.php?id=100061039050017";
const PHONE_HREF = "tel:+4555730466";
const PHONE_LABEL = "55 73 04 66";

const MENU_ITEMS = [
  {
    title: "Pizzaer",
    text: "Vores hovednummer — klassiske og fyldte pizzaer, bagt og klar til dig.",
    alt: "Pizza",
    src: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Pizzasandwiches",
    text: "Pizzaens storebror i sandwich-format — fyldigt og nemt at tage med.",
    alt: "Pizzasandwich",
    src: "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Pastaretter",
    text: "Italienske pastaretter med sauce og toppings, der mætter.",
    alt: "Pastaret",
    src: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Burgere",
    text: "Saftige burgere — når du vil have noget andet end pizza.",
    alt: "Burger",
    src: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Durum & pitabrød",
    text: "Ruller og pita med fyld — hurtig mad, der er nem at spise på farten.",
    alt: "Durum rulle",
    src: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "A'la carte & mere",
    text: "Forretter, fisk, kylling, schnitzler, salater, bagte kartofler og børneretter.",
    alt: "Salat og a la carte",
    src: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
  },
] as const;

/**
 * Pixel-faithful port of design.html
 */
export function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [year, setYear] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setYear(String(new Date().getFullYear()));

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
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    reveals.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const closeNav = () => setNavOpen(false);
  const toggleNav = () => setNavOpen((open) => !open);

  return (
    <div ref={rootRef}>
      <header
        className={`site-header${scrolled ? " is-scrolled" : ""}`}
        id="header"
      >
        <a href="#top" className="brand" onClick={closeNav}>
          Solo Pizza
          <span>Næstved</span>
        </a>
        <button
          type="button"
          className={`nav-toggle${navOpen ? " is-open" : ""}`}
          id="navToggle"
          aria-label={navOpen ? "Luk menu" : "Åbn menu"}
          aria-expanded={navOpen}
          onClick={toggleNav}
        >
          <span />
        </button>
        <nav
          className={`nav${navOpen ? " is-open" : ""}`}
          id="nav"
          aria-label="Hovedmenu"
        >
          <a href="#menu" onClick={closeNav}>
            Menu
          </a>
          <a href="#om-os" onClick={closeNav}>
            Om os
          </a>
          <a href="#stemning" onClick={closeNav}>
            Stemning
          </a>
          <a href="#besog" onClick={closeNav}>
            Besøg
          </a>
          <a
            className="nav-cta"
            href={WOLT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeNav}
          >
            Bestil på Wolt
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-label="Forside">
          <div className="hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=2000&q=80"
              alt="Friskbagt pizza med smeltet ost og tomat"
              width={2000}
              height={1333}
              fetchPriority="high"
            />
          </div>
          <div className="hero-content">
            <h1 className="hero-brand">Solo Pizza Næstved</h1>
            <p className="hero-lead">
              Pizza, pasta, burgers og mere — klar til dig i Næstved Storcenter
              eller via Wolt.
            </p>
            <div className="hero-actions">
              <a
                className="btn btn-wolt"
                href={WOLT_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Bestil på Wolt
              </a>
              <a className="btn btn-ghost" href="#menu">
                Se menuen
              </a>
            </div>
          </div>
        </section>

        <section className="menu" id="menu">
          <div className="container">
            <div className="menu-header reveal">
              <div>
                <p className="section-label">Menu</p>
                <h2 className="section-title">Noget for enhver sult</h2>
                <p className="section-text">
                  Fra klassiske pizzaer og pasta til burgers, sandwiches og
                  durum — se hele sortimentet og bestil direkte på Wolt.
                </p>
              </div>
              <div className="menu-header-actions">
                <a
                  className="btn btn-wolt"
                  href={WOLT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Bestil på Wolt
                </a>
                <a className="btn btn-dark" href={PHONE_HREF}>
                  Ring &amp; bestil
                </a>
              </div>
            </div>

            <div className="menu-grid">
              {MENU_ITEMS.map((item) => (
                <article className="menu-item reveal" key={item.title}>
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.src}
                      alt={item.alt}
                      width={900}
                      height={675}
                      loading="lazy"
                    />
                  </figure>
                  <div className="menu-item-body">
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="menu-also reveal">
              <div>
                <p>
                  Også på menuen: sandwiches, tilbehør, dyppelse og drikkevarer.
                  Se priser og bestil levering på Wolt.
                </p>
                <div className="menu-tags">
                  <span>Forretter</span>
                  <span>Sandwiches</span>
                  <span>Salater</span>
                  <span>Børneretter</span>
                  <span>Drikkevarer</span>
                </div>
              </div>
              <a
                className="btn btn-wolt"
                href={WOLT_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Åbn fuld menu på Wolt
              </a>
            </div>
          </div>
        </section>

        <section className="story" id="om-os">
          <div className="container">
            <div className="story-grid">
              <div className="story-visual reveal">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=1000&q=80"
                  alt="Pizzabager der strækker dej"
                  width={1000}
                  height={1250}
                  loading="lazy"
                />
                <p className="story-accent">
                  “God pizza handler om tid, ild og ærlighed.”
                </p>
              </div>
              <div className="story-copy reveal">
                <p className="section-label">Om Solo Pizza</p>
                <h2 className="section-title">Italiensk håndværk i Næstved</h2>
                <p className="section-text">
                  Vi serverer pizza og italiensk mad — og meget mere. Find os i
                  Næstved Storcenter, ring for takeaway, eller bestil levering
                  via Wolt.
                </p>
                <div className="story-points">
                  <div className="story-point">
                    <span className="story-num">01</span>
                    <div>
                      <strong>Dej med tålmodighed</strong>
                      <span>
                        Lang hævning giver smag, struktur og den berømte luftige
                        crust.
                      </span>
                    </div>
                  </div>
                  <div className="story-point">
                    <span className="story-num">02</span>
                    <div>
                      <strong>Råvarer med omtanke</strong>
                      <span>
                        Italien-inspirerede oste, friske grøntsager og sauce
                        lavet fra bunden.
                      </span>
                    </div>
                  </div>
                  <div className="story-point">
                    <span className="story-num">03</span>
                    <div>
                      <strong>I Næstved Storcenter</strong>
                      <span>
                        Spis her, tag med hjem, ring — eller bestil levering via
                        Wolt.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="atmosphere" id="stemning" aria-label="Stemning">
          <figure className="reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80"
              alt="Restaurant interiør"
              width={1200}
              height={800}
              loading="lazy"
            />
            <figcaption>Hyggeligt hus</figcaption>
          </figure>
          <figure className="reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pizzatwin_1100x_ce6baaf5-4b14-4cf0-86fc-7da577b3c1df.webp"
              alt="Pizza der kommer ud af ovnen"
              width={1100}
              height={800}
              loading="lazy"
            />
            <figcaption>Varm fra ovnen</figcaption>
          </figure>
          <figure className="reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80"
              alt="Italiensk middagsbord"
              width={900}
              height={800}
              loading="lazy"
            />
            <figcaption>Del gerne</figcaption>
          </figure>
        </section>

        <section className="visit" id="besog">
          <div className="container">
            <div className="reveal">
              <p className="section-label">Besøg os</p>
              <h2 className="section-title">Kom forbi — eller bestil</h2>
              <p className="section-text">
                Find os i Næstved Storcenter. Bestil levering på Wolt, ring for
                takeaway — eller kom forbi og nyd maden her.
              </p>
            </div>

            <div className="visit-grid">
              <div className="visit-details reveal">
                <div className="visit-block">
                  <h3>Adresse</h3>
                  <p>
                    Næstved Storcenter 39b
                    <br />
                    4700 Næstved
                  </p>
                </div>
                <div className="visit-block">
                  <h3>Kontakt</h3>
                  <p>
                    <a href={PHONE_HREF}>{PHONE_LABEL}</a>
                    <br />
                    <a
                      href={FACEBOOK_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Følg os på Facebook
                    </a>
                  </p>
                </div>
                <div className="visit-block">
                  <h3>Åbningstider</h3>
                  <ul className="hours-list">
                    <li>
                      <span>Mandag – Fredag</span>
                      <span>10:00 – 20:00</span>
                    </li>
                    <li>
                      <span>Lørdag – Søndag</span>
                      <span>10:00 – 16:00</span>
                    </li>
                  </ul>
                </div>
                <div className="menu-header-actions">
                  <a
                    className="btn btn-wolt"
                    href={WOLT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Bestil på Wolt
                  </a>
                  <a className="btn btn-primary" href={PHONE_HREF}>
                    Ring og bestil
                  </a>
                </div>
              </div>

              <div className="visit-map reveal">
                <iframe
                  title="Solo Pizza på Google Maps"
                  src={MAPS_EMBED}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
                <div className="visit-map-card">
                  <strong>Solo Pizza</strong>
                  <p>
                    Næstved Storcenter 39b — friskbagt pizza, hver gang.
                  </p>
                  <a
                    className="btn btn-dark"
                    href={MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Åbn i Maps
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <p className="footer-brand">Solo Pizza Næstved</p>
          <p>© {year} Solo Pizza. Alle rettigheder forbeholdes.</p>
        </div>
      </footer>
    </div>
  );
}
