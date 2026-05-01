import { EditableList, EditableText } from "@autosites/cms/components";
import { SectionTag } from "./SectionTag";

const services = [
  { id: "takeaway", label: "Takeaway" },
  { id: "morgenmad", label: "Morgenmad" },
  { id: "koerestol", label: "Kørestolsvenlig indgang" },
  { id: "parkering", label: "Parkering tæt på" },
  { id: "ingen-spisepladser", label: "Ingen spisepladser — kom forbi og tag det med" },
];

type ServiceFallback = { label: string };

function renderService({
  keyPrefix,
  fallback,
}: {
  keyPrefix: string;
  fallback: ServiceFallback;
}) {
  return (
    <li className="service-pill">
      <EditableText cmsKey={`${keyPrefix}.label`} fallback={fallback.label} as="span" />
    </li>
  );
}

export async function ServicesSection() {
  return (
    <section
      className="section-services"
      id="service"
      aria-labelledby="services-heading"
    >
      <div className="container services-inner">
        <SectionTag>
          <EditableText cmsKey="services.tag" fallback="For dig" as="span" />
        </SectionTag>
        <h2 className="section-title" id="services-heading">
          <EditableText cmsKey="services.title" fallback="Sådan besøger du os" as="span" />
        </h2>
        <EditableText
          cmsKey="services.lead"
          fallback="Vi er først og fremmest et takeaway-bageri: du får friskbagt hos os og nyder det, hvor det passer dig. Samtidig gør vi det let at komme til — også hvis du har brug for kørestolsadgang."
          as="p"
          className="services-lead"
        />
        <EditableList<ServiceFallback>
          cmsKey="services.items"
          wrapperAs="ul"
          wrapperClassName="services-list"
          fallback={services}
          newItemFallback={{ label: "Ny service" }}
          renderItem={renderService}
        />
      </div>
    </section>
  );
}
