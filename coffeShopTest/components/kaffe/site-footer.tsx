import { EditableText } from "@/lib/cms";

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
            fallback="Inquiry"
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
            fallback="Address"
            as="h4"
          />
          <EditableText
            cmsKey="footer.address.line1"
            fallback="Gothersgade 12"
            as="p"
          />
          <EditableText
            cmsKey="footer.address.line2"
            fallback="1123 København K"
            as="p"
          />
          <EditableText
            cmsKey="footer.address.line3"
            fallback="Denmark"
            as="p"
          />
        </div>
      </div>
      <div className="container kaffe-footer-copy">
        <EditableText
          cmsKey="footer.copy"
          fallback="© 2024 Kaffe&mere. A study in stillness."
        />
      </div>
    </footer>
  );
}
