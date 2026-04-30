import { ExperienceCard } from "./ExperienceCard";
import { SectionLabel } from "./SectionLabel";

const ITEMS = [
  {
    title: "Buffet",
    meta: "Hver dag 16:30 – 22:00",
    imageUrl:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=800",
  },
  {
    title: "Sushi & mongolsk grill",
    meta: "Nigiri · Inside-out · Maki · grill og salatbar",
    imageUrl:
      "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=800",
  },
  {
    title: "A la carte & takeaway",
    meta: "Fra suppe til jernfadsretter",
    imageUrl:
      "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=800",
  },
] as const;

export function ExperienceSection() {
  return (
    <section className="grid-container" id="oplevelse" style={{ paddingTop: 40 }}>
      <SectionLabel title="Oplevelsen" meta="Buffet · sushi · grill · klassikere" />
      {ITEMS.map((item) => (
        <ExperienceCard key={item.title} {...item} />
      ))}
    </section>
  );
}
