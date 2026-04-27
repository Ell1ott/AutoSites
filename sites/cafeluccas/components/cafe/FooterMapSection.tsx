import { EditableLink, EditableText } from "@autosites/cms/components";

const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Storgade+38,+4180+Sor%C3%B8";

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

      <svg
        className="svg-map"
        viewBox="0 0 800 300"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <pattern
            id="cafe-map-grid"
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="white"
              strokeWidth={1}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cafe-map-grid)" />
        <path
          d="M0 150 Q 200 100 400 150 T 800 150"
          stroke="var(--blue)"
          strokeWidth={5}
          fill="none"
        />
        <circle cx={450} cy={140} r={10} fill="var(--coral)" />
        <foreignObject x={460} y={125} width={200} height={40}>
          <div
            {...({
              xmlns: "http://www.w3.org/1999/xhtml",
              style: {
                fontFamily: "var(--font-bricolage), serif",
                fontSize: 15,
                color: "var(--blue)",
                fontWeight: 700,
              },
            } as Record<string, unknown>)}
          >
            <EditableText
              cmsKey="footer.map.marker"
              fallback="VI ER HER"
              as="span"
            />
          </div>
        </foreignObject>
      </svg>
    </section>
  );
}
