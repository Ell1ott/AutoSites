import { EditableLink, EditableList, EditableText } from "@autosites/cms/components";

const MAPS_QUERY =
  "https://www.google.com/maps/search/?api=1&query=Storegade+5%2C+6880+Tarm";

type FooterLinkFallback = { href: string; label: string };
type FooterHourFallback = { day: string; time: string };

const socialLinks = [
  { id: "facebook", href: "https://www.facebook.com/bachsbageri/", label: "Facebook" },
  {
    id: "facebook-reels",
    href: "https://www.facebook.com/bachsbageri/reels/",
    label: "Facebook Reels",
  },
  { id: "instagram", href: "https://www.instagram.com/bachsbageri/", label: "Instagram" },
];

const footerHours = [
  { id: "man-fre", day: "Man–fre", time: "06:00–17:30" },
  { id: "lordag", day: "Lørdag", time: "06:00–13:00" },
  { id: "sondag", day: "Søndag", time: "06:00–13:00" },
];

const contactLinks = [
  { id: "mail", href: "mailto:bachsbageritarm@gmail.com", label: "bachsbageritarm@gmail.com" },
  { id: "phone", href: "tel:+4597371032", label: "+45 97 37 10 32" },
];

function renderFooterLink({
  keyPrefix,
  fallback,
}: {
  keyPrefix: string;
  fallback: FooterLinkFallback;
}) {
  return (
    <li>
      <EditableLink
        cmsKey={`${keyPrefix}.link`}
        fallback={{ href: fallback.href, label: fallback.label }}
        target={fallback.href.startsWith("http") ? "_blank" : undefined}
        rel={fallback.href.startsWith("http") ? "noopener noreferrer" : undefined}
      />
    </li>
  );
}

function renderFooterHour({
  keyPrefix,
  fallback,
}: {
  keyPrefix: string;
  fallback: FooterHourFallback;
}) {
  return (
    <li>
      <EditableText
        cmsKey={`${keyPrefix}.day`}
        fallback={fallback.day}
        as="span"
        className="footer-hours-day"
      />
      <EditableText cmsKey={`${keyPrefix}.time`} fallback={fallback.time} as="span" />
    </li>
  );
}

export async function SiteFooter() {
  return (
    <footer className="bachs-footer" id="butikken">
      <div className="container footer-grid">
        <div className="footer-col footer-col-wide">
          <EditableText
            cmsKey="footer.brand"
            fallback="Bachs Bageri"
            as="div"
            className="footer-logo"
          />
          <EditableText
            cmsKey="footer.description"
            fallback="Lokalt håndværksbageri og konditori på Storegade i Tarm — med brød, wienerbrød, smørrebrød og alt det mellem. Traditioner tilbage til 1932."
            as="p"
          />
          <EditableText
            cmsKey="footer.socialIntro"
            fallback="Følg med på sociale medier"
            as="p"
            className="footer-social-intro"
          />
          <EditableList<FooterLinkFallback>
            cmsKey="footer.social.items"
            wrapperAs="ul"
            wrapperClassName="footer-social"
            fallback={socialLinks}
            newItemFallback={{ href: "https://", label: "Nyt socialt medie" }}
            renderItem={renderFooterLink}
          />
        </div>
        <div className="footer-col">
          <h4>
            <EditableText cmsKey="footer.locationTitle" fallback="Find os" as="span" />
          </h4>
          <address>
            <EditableText
              cmsKey="footer.address"
              fallback={"Storegade 5,<br />6880 Tarm<br />Danmark"}
              as="p"
            />
          </address>
          <p className="footer-map-link">
            <EditableLink
              cmsKey="footer.mapLink"
              fallback={{ href: MAPS_QUERY, label: "Åbn i kort" }}
              target="_blank"
              rel="noopener noreferrer"
            />
          </p>
        </div>
        <div className="footer-col">
          <h4>
            <EditableText cmsKey="footer.hoursTitle" fallback="Åbningstider" as="span" />
          </h4>
          <EditableList<FooterHourFallback>
            cmsKey="footer.hours.items"
            wrapperAs="ul"
            wrapperClassName="footer-hours"
            fallback={footerHours}
            newItemFallback={{ day: "Dag", time: "00:00–00:00" }}
            renderItem={renderFooterHour}
          />
        </div>
        <div className="footer-col">
          <h4>
            <EditableText cmsKey="footer.contactTitle" fallback="Kontakt" as="span" />
          </h4>
          <EditableList<FooterLinkFallback>
            cmsKey="footer.contact.items"
            wrapperAs="ul"
            fallback={contactLinks}
            newItemFallback={{ href: "tel:+4500000000", label: "Kontaktinfo" }}
            renderItem={renderFooterLink}
          />
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          <EditableText
            cmsKey="footer.bottomPrefix"
            fallback="© 2026 Bachs Bageri · CVR 10478448 · Medlem af "
            as="span"
          />
          <EditableLink
            cmsKey="footer.bottomBkdLink"
            fallback={{ href: "https://www.bkd.dk", label: "BKD" }}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-inline"
          />
        </span>
      </div>
    </footer>
  );
}
