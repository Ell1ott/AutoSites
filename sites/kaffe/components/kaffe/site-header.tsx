import { EditableLink, EditableText } from "@autosites/cms/components";
import { MobileNav } from "./mobile-nav";

export function SiteHeader() {
  return (
    <header className="container kaffe-header">
      <div className="kaffe-logo">
        <EditableText cmsKey="site.brand.name" fallback="KAFFE&MERE" />
      </div>
      <MobileNav>
        <ul>
          <li>
            <EditableLink
              cmsKey="nav.0"
              fallback={{ href: "#", label: "Overblik" }}
            />
          </li>
          <li>
            <EditableLink
              cmsKey="nav.1"
              fallback={{ href: "#menu", label: "Menu" }}
            />
          </li>
          <li>
            <EditableLink
              cmsKey="nav.2"
              fallback={{ href: "#åbningstider", label: "Åbningstider" }}
            />
          </li>
          <li>
            <EditableLink
              cmsKey="nav.3"
              fallback={{ href: "#arrangementer", label: "Arrangementer" }}
            />
          </li>
        </ul>
      </MobileNav>
    </header>
  );
}
