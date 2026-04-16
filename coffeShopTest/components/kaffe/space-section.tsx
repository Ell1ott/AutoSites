import { EditableImage, EditableText } from "@/lib/cms";

export function SpaceSection() {
  return (
    <section className="container kaffe-space-section">
      <div className="kaffe-grid-3">
        <div className="kaffe-hero-image-wrap kaffe-space-image">
          <EditableImage
            cmsKey="home.space.image"
            fallback={{
              src: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=2047",
              alt: "Cafe space",
            }}
            fill
            sizes="(max-width: 1440px) 66vw, 950px"
            className="object-cover [filter:grayscale(20%)_sepia(10%)]"
          />
        </div>
        <div className="kaffe-space-aside">
          <span className="kaffe-metadata">
            <EditableText cmsKey="home.space.label" fallback="Space" />
          </span>
          <EditableText
            cmsKey="home.space.heading"
            fallback="Materials of Rest."
            as="h2"
          />
          <EditableText
            cmsKey="home.space.body"
            fallback="Our flagship store utilizes reclaimed oak beams and hand-applied lime wash to create a sensory vacuum."
            as="p"
          />
        </div>
      </div>
    </section>
  );
}
