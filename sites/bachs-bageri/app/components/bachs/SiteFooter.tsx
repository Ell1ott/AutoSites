const MAPS_QUERY =
  "https://www.google.com/maps/search/?api=1&query=Storegade+5%2C+6880+Tarm";

export function SiteFooter() {
  return (
    <footer className="bachs-footer" id="butikken">
      <div className="container footer-grid">
        <div className="footer-col footer-col-wide">
          <div className="footer-logo">Bachs Bageri</div>
          <p>
            Lokalt håndværksbageri og konditori på Storegade i Tarm — med brød,
            wienerbrød, smørrebrød og alt det mellem. Traditioner tilbage til
            1932.
          </p>
          <p className="footer-social-intro">Følg med på sociale medier</p>
          <ul className="footer-social">
            <li>
              <a
                href="https://www.facebook.com/bachsbageri/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Facebook
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/bachsbageri/reels/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Facebook Reels
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/bachsbageri/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </a>
            </li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Find os</h4>
          <address>
            <p>
              Storegade 5,
              <br />
              6880 Tarm
              <br />
              Danmark
            </p>
          </address>
          <p className="footer-map-link">
            <a href={MAPS_QUERY} target="_blank" rel="noopener noreferrer">
              Åbn i kort
            </a>
          </p>
        </div>
        <div className="footer-col">
          <h4>Åbningstider</h4>
          <ul className="footer-hours">
            <li>
              <span className="footer-hours-day">Man–fre</span>
              <span>06:00–17:30</span>
            </li>
            <li>
              <span className="footer-hours-day">Lørdag</span>
              <span>06:00–13:00</span>
            </li>
            <li>
              <span className="footer-hours-day">Søndag</span>
              <span>06:00–13:00</span>
            </li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Kontakt</h4>
          <ul>
            <li>
              <a href="mailto:bachsbageritarm@gmail.com">
                bachsbageritarm@gmail.com
              </a>
            </li>
            <li>
              <a href="tel:+4597371032">+45 97 37 10 32</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © 2026 Bachs Bageri · CVR 10478448 · Medlem af{" "}
          <a
            href="https://www.bkd.dk"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-inline"
          >
            BKD
          </a>
        </span>
      </div>
    </footer>
  );
}
