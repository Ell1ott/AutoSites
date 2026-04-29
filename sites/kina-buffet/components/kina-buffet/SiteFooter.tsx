import Link from "next/link";

const YEAR = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer>
      <div className="footer-top">
        <div className="logo-block">
          <div className="logo-main" style={{ color: "white", fontSize: "3rem" }}>
            KINA
          </div>
          <div
            className="logo-sub"
            style={{ color: "var(--dark)", background: "white", padding: "2px 5px", width: "fit-content" }}
          >
            EST. 1994
          </div>
        </div>
        <div className="footer-col">
          <h4>Location</h4>
          <p>
            128 East Dragon Rd.
            <br />
            Metropolis City, CP 4500
          </p>
        </div>
        <div className="footer-col">
          <h4>Contact</h4>
          <p>
            +45 88 92 10 00
            <br />
            hello@kinabuffet.com
          </p>
        </div>
        <div className="footer-col">
          <h4>Hours</h4>
          <p>Mon-Sun: 11:00 — 22:00</p>
        </div>
      </div>

      <div className="footer-bottom">
        <div>© {YEAR} Kina Buffet Group. All Rights Reserved.</div>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <Link href="#" style={{ color: "white", textDecoration: "none" }}>
            Instagram
          </Link>
          <Link href="#" style={{ color: "white", textDecoration: "none" }}>
            Facebook
          </Link>
          <Link href="#" style={{ color: "white", textDecoration: "none" }}>
            Careers
          </Link>
        </div>
        <div>Built for the love of Asian Cuisine.</div>
      </div>
    </footer>
  );
}
