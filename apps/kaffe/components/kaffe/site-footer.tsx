import { CmsFooterAdminLink, EditableText } from "@/lib/cms";

export function SiteFooter() {
  return (
    <footer className="kaffe-footer">
      <div className="container kaffe-footer-grid">
        <div className="kaffe-footer-logo">
          <EditableText cmsKey="site.brand.shortName" fallback="K&M" />
        </div>
        <div className="kaffe-footer-col">
          <EditableText
            cmsKey="footer.inquiry.heading"
            fallback="Kontakt"
            as="h4"
          />
          <EditableText
            cmsKey="footer.inquiry.email"
            fallback="hej@kaffemere.dk"
            as="p"
          />
          <EditableText
            cmsKey="footer.inquiry.phone"
            fallback="+45 20 30 40 50"
            as="p"
          />
        </div>
        <div className="kaffe-footer-col">
          <EditableText
            cmsKey="footer.address.heading"
            fallback="Adresse"
            as="h4"
          />
          <EditableText
            cmsKey="footer.address.line1"
            fallback="Storgade 27"
            as="p"
          />
          <EditableText
            cmsKey="footer.address.line2"
            fallback="4180 Sorø"
            as="p"
          />
          <EditableText
            cmsKey="footer.address.line3"
            fallback="Danmark"
            as="p"
          />
        </div>
        <div className="kaffe-footer-col">
          <EditableText
            cmsKey="footer.hours.heading"
            fallback="Åbningstider"
            as="h4"
          />
          <EditableText
            cmsKey="footer.hours.weekdays"
            fallback="Man – Fre: 09 – 17"
            as="p"
          />
          <EditableText
            cmsKey="footer.hours.saturday"
            fallback="Lørdag: 09 – 14"
            as="p"
          />
          <EditableText
            cmsKey="footer.hours.sunday"
            fallback="Søndag: Lukket"
            as="p"
          />
        </div>
      </div>
      <div className="container kaffe-footer-copy">
        <div className="kaffe-footer-copy-row">
          <div className="kaffe-footer-copy-text">
            <EditableText
              cmsKey="footer.copy"
              fallback="© 2025 KAFFE&MERE — STORGADE 27, SORØ"
            />
          </div>
          <CmsFooterAdminLink className="kaffe-footer-admin-link" />
        </div>
      </div>
    </footer>
  );
}
