export function FooterMapSection() {
  return (
    <section id="contact" className="footer-map" aria-label="Location">
      <div className="map-overlay">
        <div className="logo">Luccas HQ</div>
        <p className="map-address">
          122 Nordic Way, Copenhagen
          <br />
          <a href="tel:+4520304050" className="map-phone">
            +45 20 30 40 50
          </a>
        </p>
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
          WE ARE HERE
        </text>
      </svg>
    </section>
  );
}
