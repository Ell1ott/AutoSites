import { EditableImage } from "@autosites/cms/components";

const HERO_SRC =
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=2000";

export async function HeroParallaxImage() {
  return (
    <EditableImage
      cmsKey="hero.mainImage"
      fallback={{ src: HERO_SRC, alt: "Friskbagt brød fra Bachs Bageri" }}
      fill
      priority
      sizes="60vw"
      style={{
        objectFit: "cover",
        filter: "grayscale(20%) sepia(10%)",
      }}
    />
  );
}
