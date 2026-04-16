import { EditableText } from "@/lib/cms";
import { MenuCard } from "./menu-card";

export function CollectionSection() {
  return (
    <section className="container">
      <div className="kaffe-section-label">
        <span className="kaffe-metadata">
          <EditableText
            cmsKey="home.collection.label.left"
            fallback="The Collection"
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
            title: "Origin V60",
            description:
              "Notes of stone fruit, bergamot, and morning air.",
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
            title: "Dark Matter",
            description:
              "Viscous, velvety, with a lingering cocoa finish.",
            imageSrc:
              "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=1000",
            imageAlt: "Espresso",
          }}
        />
        <MenuCard
          keyPrefix="menu.003"
          fallbacks={{
            code: "003",
            title: "Still Cold",
            description: "Steeped for 18 hours in stone crocks.",
            imageSrc:
              "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=1000",
            imageAlt: "Cold Brew",
          }}
        />
      </div>
    </section>
  );
}
