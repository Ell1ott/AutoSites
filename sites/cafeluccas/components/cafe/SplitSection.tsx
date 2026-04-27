import { EditableLink, EditableText } from "@autosites/cms/components";

const MAPS_FALLBACK =
  "https://www.google.com/maps/search/?api=1&query=Storgade+38,+4180+Sor%C3%B8";

export async function SplitSection() {
  return (
    <section className="split-section" id="about" aria-label="Om Café Luccas">
      <div className="split-box">
        <EditableText
          cmsKey="split.about.label"
          fallback="Om os"
          as="h4"
          className="split-label"
        />
        <EditableText
          cmsKey="split.about.body"
          fallback="Café Luccas ligger centralt i hjertet af Sorø. Vi er en familievenlig pizza- og grillrestaurant med fokus på hjemmelavet mad, hygge og smag — uanset om du sætter dig ved et bord eller bestiller take away."
          as="p"
          className="split-about-text"
        />
        <EditableText
          cmsKey="split.hours.label"
          fallback="Åbningstider"
          as="h4"
          className="split-label split-label-spaced"
        />
        <EditableText
          cmsKey="split.hours.lines"
          fallback="Alle dage: 11.00 – 22.00"
          as="p"
          className="split-hours-text"
        />
        <p className="split-capacity">
          <EditableText
            cmsKey="split.capacity"
            fallback='Siddepladser i caféen: op til <strong>34 gæster</strong>.'
            as="span"
          />
        </p>
        <EditableLink
          cmsKey="split.ctaMenu"
          fallback={{ href: "/menu", label: "Gå til menuen" }}
          className="btn-outline split-menu-link"
        />
      </div>
      <div
        className="split-box split-newsletter"
        style={{ backgroundColor: "var(--blue)", color: "white" }}
      >
        <EditableText
          cmsKey="split.takeaway.label"
          fallback="Take away"
          as="h4"
          className="split-label"
        />
        <EditableText
          cmsKey="split.takeaway.copy"
          fallback="Ring og bestil — så gør vi maden klar til afhentning, når det passer dig."
          as="p"
          className="split-newsletter-copy"
        />
        <p className="split-phone-block">
          <EditableLink
            cmsKey="split.phone.primary"
            fallback={{ href: "tel:+4557834466", label: "57 83 44 66" }}
            className="split-phone-link"
          />
          <br />
          <EditableLink
            cmsKey="split.phone.secondary"
            fallback={{ href: "tel:+4540241971", label: "40 24 19 71" }}
            className="split-phone-link"
          />
        </p>
        <EditableLink
          cmsKey="split.maps"
          fallback={{ href: MAPS_FALLBACK, label: "Åbn i Google Maps" }}
          className="btn-outline split-maps-btn"
          style={{ borderColor: "white", color: "white" }}
          target="_blank"
          rel="noopener noreferrer"
        />
      </div>
    </section>
  );
}
