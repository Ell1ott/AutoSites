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
            BUFFET · IKAST
          </div>
        </div>
        <div className="footer-col">
          <h4>Adresse</h4>
          <p>
            Østergade 11
            <br />
            7430 Ikast, Danmark
          </p>
        </div>
        <div className="footer-col">
          <h4>Kontakt</h4>
          <p>
            <a href="tel:+4597181888" style={{ color: "inherit", textDecoration: "none" }}>
              97 18 18 88
            </a>
            <br />
            <Link href="https://kinabuffet.com/" style={{ color: "inherit", textDecoration: "none" }}>
              kinabuffet.com
            </Link>
          </p>
        </div>
        <div className="footer-col">
          <h4>Buffet</h4>
          <p>Hver dag 16:30 — 22:00</p>
        </div>
      </div>

      <div className="footer-bottom">
        <div>© {YEAR} Restaurant Kina Buffet · Kinabuffet</div>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <Link
            href="https://www.facebook.com/kinabuffet/"
            style={{ color: "white", textDecoration: "none" }}
          >
            Facebook
          </Link>
          <Link href="/menu" style={{ color: "white", textDecoration: "none" }}>
            Menukort
          </Link>
          <Link href="/om-os" style={{ color: "white", textDecoration: "none" }}>
            Om os
          </Link>
          <Link href="https://kinabuffet.com/" style={{ color: "white", textDecoration: "none" }}>
            Bestil bord
          </Link>
        </div>
        <div>Elite Smiley · Autentisk kinesisk i hjertet af Ikast</div>
      </div>
    </footer>
  );
}
