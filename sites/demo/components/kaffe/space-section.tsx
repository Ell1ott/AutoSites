import { EditableImage, EditableText } from "@autosites/cms/components";

export function SpaceSection() {
  return (
    <section id="arrangementer" className="container kaffe-space-section">
      <div className="kaffe-grid-3">
        <div className="kaffe-hero-image-wrap kaffe-space-image">
          <EditableImage
            cmsKey="home.space.image"
            fallback={{
              src: "https://nkuxxhuyeiwopzcdwsaq.supabase.co/storage/v1/object/public/cms-images/1b61a950-4245-4f3b-ad7d-11e8aa880684.jpg",
              alt: "Cafe space",
            }}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1440px) 66vw, 950px"
            className="object-cover [filter:grayscale(20%)_sepia(10%)]"
          />
        </div>
        <div className="kaffe-space-aside">
          <span className="kaffe-metadata">
            <EditableText cmsKey="home.space.label" fallback="SELSKABER & ARRANGEMENTER" />
          </span>
          <EditableText
            cmsKey="home.space.heading"
            fallback="Hold dit næste arrangement hos os"
            as="h2"
          />
          <EditableText
            cmsKey="home.space.body"
            fallback="Vi tilbyder booking til private selskaber, fødselsdage og firmaarrangementer. Kontakt os via Facebook eller kig forbi butikken på Storgade 27 for at høre mere."
            as="p"
          />
        </div>
      </div>
    </section>
  );
}
