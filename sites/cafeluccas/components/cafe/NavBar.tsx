const LINKS = [
  { href: "#home", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#menu", label: "Menu" },
  { href: "#bookings", label: "Bookings" },
  { href: "#contact", label: "Contact" },
] as const;

export function NavBar() {
  return (
    <nav>
      <div className="logo">Café Luccas.</div>
      <div className="nav-links">
        {LINKS.map(({ href, label }) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
