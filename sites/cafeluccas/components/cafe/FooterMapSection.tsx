const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Storgade+38,+4180+Sor%C3%B8";

export function FooterMapSection() {
  return (
    <section id="contact" className="footer-map" aria-label="Find os">
      <div className="map-overlay">
        <div className="logo">Café Luccas</div>
        <p className="map-tagline">Pizza &amp; grill · Sorø</p>
        <p className="map-address">
          Storgade 38
          <br />
          4180 Sorø
        </p>
        <p className="map-phones">
          <a href="tel:+4557834466" className="map-phone">
            57 83 44 66
          </a>
          <span className="map-phone-sep"> · </span>
          <a href="tel:+4540241971" className="map-phone">
            40 24 19 71
          </a>
        </p>
        <p className="map-hours">Alle dage 11.00 – 22.00</p>
        <a
          href={MAPS_URL}
          className="map-directions-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Vejvisning
        </a>
      </div>

      <svg
        className="svg-map"
        viewBox="0 0 800 300"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <pattern
            id="cafe-map-grid"
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="white"
              strokeWidth={1}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cafe-map-grid)" />
        <path
          d="M0 150 Q 200 100 400 150 T 800 150"
          stroke="var(--blue)"
          strokeWidth={5}
          fill="none"
        />
        <circle cx={450} cy={140} r={10} fill="var(--coral)" />
        <text
          x={468}
          y={146}
          fontFamily="var(--font-bricolage), serif"
          fontSize={15}
          fill="var(--blue)"
        >
          VI ER HER
        </text>
      </svg>
    </section>
  );
}
