const navLinks = [
  { href: "#menu", label: "Vores Brød" },
  { href: "#processen", label: "Processen" },
  { href: "#butikken", label: "Butikken" },
  { href: "#bestil", label: "Bestil" },
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
        <div className="brand-tagline">EST. Aarhus 1982</div>
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
