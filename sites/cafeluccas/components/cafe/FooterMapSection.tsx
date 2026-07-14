import { EditableLink, EditableText } from "@autosites/cms/components";

const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Storgade+38,+4180+Sor%C3%B8";
const MAPS_EMBED_URL =
  "https://maps.google.com/maps?q=Storgade+38,+4180+Sor%C3%B8,+Denmark&hl=da&z=16&output=embed";

export async function FooterMapSection() {
  return (
    <section id="contact" className="footer-map" aria-label="Find os">
      <div className="map-overlay">
        <div className="logo">
          <EditableText cmsKey="footer.brand" fallback="Café Luccas" as="span" />
        </div>
        <EditableText
          cmsKey="footer.tagline"
          fallback="Pizza &amp; grill · Sorø"
          as="p"
          className="map-tagline"
        />
        <EditableText
          cmsKey="footer.address"
          fallback="Storgade 38<br />4180 Sorø"
          as="p"
          className="map-address"
        />
        <p className="map-phones">
          <EditableLink
            cmsKey="footer.phone.primary"
            fallback={{ href: "tel:+4557834466", label: "57 83 44 66" }}
            className="map-phone"
          />
          <span className="map-phone-sep"> · </span>
          <EditableLink
            cmsKey="footer.phone.secondary"
            fallback={{ href: "tel:+4540241971", label: "40 24 19 71" }}
            className="map-phone"
          />
        </p>
        <EditableText
          cmsKey="footer.hours"
          fallback="Alle dage 11.00 – 22.00"
          as="p"
          className="map-hours"
        />
        <EditableLink
          cmsKey="footer.directions"
          fallback={{ href: MAPS_URL, label: "Vejvisning" }}
          className="map-directions-link"
          target="_blank"
          rel="noopener noreferrer"
        />
      </div>

      <iframe
        className="map-embed"
        src={MAPS_EMBED_URL}
        title="Kort over Café Luccas, Storgade 38, Sorø"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </section>
  );
}
