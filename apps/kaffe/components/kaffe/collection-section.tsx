import { EditableText } from "@autosites/cms/components";
import { MenuCard } from "./menu-card";

export function CollectionSection() {
  return (
    <section id="menu" className="container">
      <div className="kaffe-section-label">
        <span className="kaffe-metadata">
          <EditableText
            cmsKey="home.collection.label.left"
            fallback="Fra vores menu"
          />
        </span>
        <span className="kaffe-metadata">
          <EditableText
            cmsKey="home.collection.label.right"
            fallback="01 / 03"
          />
        </span>
      </div>
      <div className="kaffe-grid-3">
        <MenuCard
          keyPrefix="menu.001"
          fallbacks={{
            code: "001",
            title: "Specialkaffe",
            description:
              "Friskbrygget kaffe fra udvalgte risterier — nyd den her eller tag den med.",
            imageSrc:
              "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=1000",
            imageAlt: "V60",
          }}
        />
        <MenuCard
          keyPrefix="menu.002"
          offset
          fallbacks={{
            code: "002",
            title: "Hjemmebagt kage",
            description:
              "Altid friskbagt — fra klassiske favoritter til sæsonens nye fristelser.",
            imageSrc:
              "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=1000",
            imageAlt: "Espresso",
          }}
        />
        <MenuCard
          keyPrefix="menu.003"
          fallbacks={{
            code: "003",
            title: "Brunch & frokost",
            description: "Lette retter og a la carte — perfekt til en pause midt på dagen.",
            imageSrc:
              "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=1000",
            imageAlt: "Cold Brew",
          }}
        />
      </div>
    </section>
  );
}
