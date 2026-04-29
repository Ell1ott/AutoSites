import { ExperienceCard } from "./ExperienceCard";
import { SectionLabel } from "./SectionLabel";

const ITEMS = [
  {
    title: "Traditional Dim Sum",
    meta: "Hand-rolled daily",
    imageUrl:
      "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&q=80&w=800",
  },
  {
    title: "Sichuan Specials",
    meta: "Authentic spice",
    imageUrl:
      "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=800",
  },
  {
    title: "Sushi Bar",
    meta: "Premium grade",
    imageUrl:
      "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=800",
  },
] as const;

export function ExperienceSection() {
  return (
    <section className="grid-container" id="menu">
      <SectionLabel title="The Experience" meta="Selection of 120+ Dishes" />
      {ITEMS.map((item) => (
        <ExperienceCard key={item.title} {...item} />
      ))}
    </section>
  );
}
