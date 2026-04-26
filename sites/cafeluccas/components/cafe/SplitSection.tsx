import { NewsletterForm } from "./NewsletterForm";

const SOCIAL = [
  { label: "FB", href: "https://facebook.com" },
  { label: "IG", href: "https://instagram.com" },
  { label: "TW", href: "https://twitter.com" },
] as const;

export function SplitSection() {
  return (
    <section className="split-section" id="about" aria-label="Hours and newsletter">
      <div className="split-box">
        <h4 className="split-label">Hours</h4>
        <p className="split-hours-text">
          Mon — Fri: 11:00 - 22:00
          <br />
          Sat — Sun: 12:00 - 00:00
        </p>
        <div className="icon-grid">
          {SOCIAL.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="circle-icon"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
      <div
        className="split-box split-newsletter"
        style={{ backgroundColor: "var(--blue)", color: "white" }}
      >
        <h4 className="split-label">Join the club</h4>
        <p className="split-newsletter-copy">
          Sign up for our newsletter and get a free garlic bread on your first
          visit. No spam, just pizza.
        </p>
        <NewsletterForm />
      </div>
    </section>
  );
}
