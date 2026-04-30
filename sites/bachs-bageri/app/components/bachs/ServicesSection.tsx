import { SectionTag } from "./SectionTag";

const services = [
  "Takeaway",
  "Morgenmad",
  "Kørestolsvenlig indgang",
  "Parkering tæt på",
  "Ingen spisepladser — kom forbi og tag det med",
] as const;

export function ServicesSection() {
  return (
    <section
      className="section-services"
      id="service"
      aria-labelledby="services-heading"
    >
      <div className="container services-inner">
        <SectionTag>For dig</SectionTag>
        <h2 className="section-title" id="services-heading">
          Sådan besøger du os
        </h2>
        <p className="services-lead">
          Vi er først og fremmest et takeaway-bageri: du får friskbagt hos os og
          nyder det, hvor det passer dig. Samtidig gør vi det let at komme til
          — også hvis du har brug for kørestolsadgang.
        </p>
        <ul className="services-list">
          {services.map((label) => (
            <li key={label} className="service-pill">
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
