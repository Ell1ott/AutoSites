const navLinks = [
  { href: "#sortiment", label: "Sortiment" },
  { href: "#om-os", label: "Om os" },
  { href: "#service", label: "For dig" },
  { href: "#bestil", label: "Bestil" },
  { href: "#butikken", label: "Kontakt" },
] as const;

export function SiteHeaderNav() {
  return (
    <div className="nav-float">
      <a href="#top" className="brand-box">
        <div className="brand-logo">
          Bachs
          <br />
          Bageri
        </div>
        <div className="brand-tagline">Traditioner siden 1932</div>
      </a>
      <nav className="bachs-nav" aria-label="Hovedmenu">
        <ul>
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <a href={href}>{label}</a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
