import { EditableLink, EditableText } from "@/lib/cms";

export function SiteHeader() {
  return (
    <header className="container kaffe-header">
      <div className="kaffe-logo">
        <EditableText cmsKey="site.brand.name" fallback="Kaffe&mere" />
      </div>
      <nav className="kaffe-nav" aria-label="Primary">
        <ul>
          <li>
            <EditableLink
              cmsKey="nav.1"
              fallback={{ href: "#", label: "The Brew" }}
            />
          </li>
          <li>
            <EditableLink
              cmsKey="nav.2"
              fallback={{ href: "#", label: "Spaces" }}
            />
          </li>
          <li>
            <EditableLink
              cmsKey="nav.3"
              fallback={{ href: "#", label: "Ethics" }}
            />
          </li>
          <li>
            <EditableLink
              cmsKey="nav.4"
              fallback={{ href: "#", label: "Visit" }}
            />
          </li>
        </ul>
      </nav>
    </header>
  );
}
