import { menuItems } from "@/lib/kaffe-content";
import { MenuCard } from "./menu-card";
import { SectionLabel } from "./section-label";

export function CollectionSection() {
  return (
    <section className="container">
      <SectionLabel left="The Collection" right="01 / 03" />
      <div className="kaffe-grid-3">
        {menuItems.map((item) => (
          <MenuCard
            key={item.code}
            code={item.code}
            title={item.title}
            description={item.description}
            imageSrc={item.imageSrc}
            imageAlt={item.imageAlt}
            offset={item.offset}
          />
        ))}
      </div>
    </section>
  );
}
