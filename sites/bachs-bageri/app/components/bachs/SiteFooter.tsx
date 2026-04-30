export function SiteFooter() {
  return (
    <footer className="bachs-footer" id="butikken">
      <div className="container footer-grid">
        <div className="footer-col">
          <div className="footer-logo">Bachs Bageri</div>
          <p>
            Et lille bageri med store drømme om det gode brød. Vi bruger kun
            lokale råvarer og masser af kærlighed.
          </p>
        </div>
        <div className="footer-col">
          <h4>Find os</h4>
          <address>
            <p>
              Graven 14,
              <br />
              8000 Aarhus C
              <br />
              Danmark
            </p>
          </address>
        </div>
        <div className="footer-col">
          <h4>Åbningstider</h4>
          <ul>
            <li>Man - Fre: 07:00 — 17:30</li>
            <li>Lør - Søn: 08:00 — 15:00</li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Kontakt</h4>
          <ul>
            <li>
              <a href="mailto:hej@bachsbageri.dk">hej@bachsbageri.dk</a>
            </li>
            <li>
              <a href="tel:+4586123456">+45 86 12 34 56</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2024 Bachs Bageri — Håndværk frem for alt</span>
        <span>Design: Studio Scandi</span>
      </div>
    </footer>
  );
}
