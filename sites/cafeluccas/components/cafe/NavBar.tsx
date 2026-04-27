import { EditableLink } from "@autosites/cms/components";
import { NavBarClient } from "./NavBarClient";

const NAV_ITEMS = [
  { cmsKey: "nav.forside", href: "/", label: "Forside" },
  { cmsKey: "nav.about", href: "/#about", label: "Om os" },
  { cmsKey: "nav.menu", href: "/menu", label: "Menu" },
  { cmsKey: "nav.order", href: "tel:+4557834466", label: "Bestil" },
  { cmsKey: "nav.contact", href: "/#contact", label: "Kontakt" },
] as const;

export async function NavBar() {
  return (
    <NavBarClient
      brand={
        <EditableLink
          cmsKey="nav.brand"
          fallback={{ href: "/", label: "Café Luccas" }}
          className="logo logo-link"
        />
      }
    >
      {NAV_ITEMS.map(({ cmsKey, href, label }) => (
        <EditableLink
          key={cmsKey}
          cmsKey={cmsKey}
          fallback={{ href, label }}
        />
      ))}
    </NavBarClient>
  );
}
