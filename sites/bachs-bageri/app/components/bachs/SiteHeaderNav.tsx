import {
  EditableLink,
  EditableList,
  EditableText,
} from "@autosites/cms/components";
import { SiteHeaderNavToggle } from "./SiteHeaderNavToggle";

type NavItemFallback = {
  href: string;
  label: string;
};

const navLinks = [
  { id: "sortiment", href: "#sortiment", label: "Sortiment" },
  { id: "om-os", href: "#om-os", label: "Om os" },
  { id: "for-dig", href: "#service", label: "For dig" },
  { id: "bestil", href: "#bestil", label: "Bestil" },
  { id: "kontakt", href: "#butikken", label: "Kontakt" },
];

function renderNavItem({
  keyPrefix,
  fallback,
}: {
  keyPrefix: string;
  fallback: NavItemFallback;
}) {
  return (
    <li>
      <EditableLink
        cmsKey={`${keyPrefix}.link`}
        fallback={{ href: fallback.href, label: fallback.label }}
      />
    </li>
  );
}

export async function SiteHeaderNav() {
  return (
    <div className="nav-float">
      <SiteHeaderNavToggle />
      <div className="mobile-top-nav-row">
        <EditableLink
          cmsKey="nav.brandLink"
          fallback={{ href: "#top", label: "Bachs Bageri" }}
          className="brand-box"
        >
          {() => (
            <>
              <div className="brand-logo">
                <EditableText
                  cmsKey="nav.brandName"
                  fallback="Bachs<br />Bageri"
                  as="span"
                />
              </div>
              <EditableText
                cmsKey="nav.brandTagline"
                fallback="Traditioner siden 1932"
                as="div"
                className="brand-tagline"
              />
            </>
          )}
        </EditableLink>

        <button
          id="bachs-mobile-toggle"
          type="button"
          className="mobile-nav-toggle"
          aria-expanded={false}
          aria-controls="bachs-mobile-menu"
          aria-label="Åbn menu"
        >
          <span className="mobile-nav-toggle-line" />
          <span className="mobile-nav-toggle-line" />
          <span className="mobile-nav-toggle-line" />
        </button>
      </div>

      <button
        id="bachs-mobile-backdrop"
        type="button"
        className="mobile-nav-backdrop"
        aria-hidden
        tabIndex={-1}
      />

      <nav
        className="bachs-nav"
        aria-label="Hovedmenu"
        id="bachs-mobile-menu"
      >
        <div className="mobile-nav-panel-head">
          <EditableText
            cmsKey="nav.panelLabel"
            fallback="Navigation"
            as="span"
            className="mobile-nav-panel-label"
          />
          <button
            id="bachs-mobile-close"
            type="button"
            className="mobile-nav-close"
            aria-label="Luk menu"
          >
            <EditableText cmsKey="nav.closeLabel" fallback="Luk" as="span" />
          </button>
        </div>
        <EditableList<NavItemFallback>
          cmsKey="nav.items"
          wrapperAs="ul"
          fallback={navLinks}
          newItemFallback={{ href: "#", label: "Nyt menupunkt" }}
          renderItem={renderNavItem}
        />
      </nav>
    </div>
  );
}
