export function Hero() {
  return (
    <section className="hero" aria-label="Welcome">
      <div className="hero-visual">
        <figure
          className="hero-media"
          role="img"
          aria-label="Fresh Asian dishes at Kina Buffet"
        />
        <div className="hero-copy">
          <p className="hero-flair" aria-hidden>
            Authentic since 1994
          </p>
          <div className="hero-copy-inner">
            <p className="hero-kicker">Restaurant Kina</p>
            <h1 className="hero-headline">
              Asian, <span>done right.</span>
            </h1>
            <p className="hero-lede">
              <strong>Fresh every day since &rsquo;94.</strong> Authentic buffet, dim sum, catering
              &amp; takeaway &mdash; modern dining without losing the classics.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
