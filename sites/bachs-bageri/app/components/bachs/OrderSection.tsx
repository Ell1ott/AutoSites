import { EditableLink, EditableText } from "@autosites/cms/components";
import { SectionTag } from "./SectionTag";

const MAIL = "bachsbageritarm@gmail.com";

export async function OrderSection() {
  return (
    <section
      className="section-order"
      id="bestil"
      aria-labelledby="order-heading"
    >
      <div className="container">
        <div className="order-card">
          <SectionTag>
            <EditableText cmsKey="order.tag" fallback="Bestilling" as="span" />
          </SectionTag>
          <h3 className="section-title order-title" id="order-heading">
            <EditableText
              cmsKey="order.title"
              fallback="Ring eller skriv — så hjælper vi dig"
              as="span"
            />
          </h3>
          <EditableText
            cmsKey="order.body"
            fallback="Skal du bruge noget bestemt til et selskab, mange sandwich eller en kage på et tidspunkt? Kontakt os gerne i god tid, så vi kan sige ja til det, du drømmer om."
            as="p"
          />
          <div className="order-actions">
            <EditableLink
              cmsKey="order.emailCta"
              fallback={{
                href: `mailto:${MAIL}?subject=Forespørgsel%20fra%20websitet`,
                label: "Send en mail",
              }}
              className="btn-primary"
            />
            <EditableLink
              cmsKey="order.phoneCta"
              fallback={{ href: "tel:+4597371032", label: "Ring til bageren" }}
              className="btn-secondary"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
