import { SITE_NAME } from "@/lib/kaffe-content";

const inquiryLines = ["hej@kaffemere.dk", "+45 20 30 40 50"] as const;
const addressLines = ["Gothersgade 12", "1123 København K", "Denmark"] as const;

export function SiteFooter() {
  return (
    <footer className="kaffe-footer">
      <div className="container kaffe-footer-grid">
        <div className="kaffe-footer-logo">K&amp;M</div>
        <div className="kaffe-footer-col">
          <h4>Inquiry</h4>
          {inquiryLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="kaffe-footer-col">
          <h4>Address</h4>
          {addressLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
      <div className="container kaffe-footer-copy">
        © 2024 {SITE_NAME}. A study in stillness.
      </div>
    </footer>
  );
}
