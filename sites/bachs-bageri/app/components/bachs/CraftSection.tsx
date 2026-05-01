import { EditableImage, EditableLink, EditableText } from "@autosites/cms/components";
import { SectionTag } from "./SectionTag";

const CRAFT_IMG =
  "https://images.unsplash.com/photo-1585478259715-876a6a81fc08?auto=format&fit=crop&q=80&w=1200";

export async function CraftSection() {
  return (
    <section
      className="section-craft"
      id="om-os"
      aria-labelledby="craft-heading"
    >
      <div className="container grid-layout">
        <div className="craft-text">
          <SectionTag>
            <EditableText cmsKey="craft.tag" fallback="Om Bachs Bageri" as="span" />
          </SectionTag>
          <h2 className="section-title" id="craft-heading">
            <EditableText
              cmsKey="craft.title"
              fallback="Fra 1932 tilbage på hylderne i Tarm"
              as="span"
            />
          </h2>
          <p>
            <EditableText
              cmsKey="craft.body.beforeBkd"
              fallback="Bachs Bageri bygger på gamle traditioner og ægte bageryrk. Vi er medlem af "
              as="span"
            />
            <EditableLink
              cmsKey="craft.body.bkdLink"
              fallback={{
                href: "https://www.bkd.dk",
                label: "BKD — Brancheforeningen af Danske Konditorer og Bagere",
              }}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-link"
            />
            <EditableText
              cmsKey="craft.body.afterBkd"
              fallback=", og vi passer på håndværket i hver eneste rugklump og wienerbrød."
              as="span"
            />
          </p>
          <EditableText
            cmsKey="craft.body.secondary"
            fallback="I 2014 overtog vi Guldbageren her på Storegade. Siden har vi holdt dampen oppe og bagværket frisk — som den eneste rigtige bager i Tarm."
            as="p"
          />
          <div className="craft-organic">
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M20 5V35M5 20H35"
                stroke="#D27D5E"
                strokeWidth="1"
              />
              <circle
                cx="20"
                cy="20"
                r="18"
                stroke="#D27D5E"
                strokeWidth="0.5"
              />
            </svg>
            <EditableText
              cmsKey="craft.cvrLabel"
              fallback="CVR 10478448 · Bachs Bageri"
              as="span"
              className="craft-organic-label"
            />
          </div>
        </div>
        <div className="craft-image">
          <EditableImage
            cmsKey="craft.image"
            fallback={{ src: CRAFT_IMG, alt: "Bageryrk og dej på et lokalt bageri" }}
            fill
            sizes="(max-width: 1024px) 100vw, 42vw"
            style={{ objectFit: "cover" }}
          />

          <svg
            className="botanical-svg"
            style={{ bottom: -50, left: -50, width: 300 }}
            viewBox="0 0 100 100"
            aria-hidden
          >
            <path
              d="M50 100 C 50 100, 30 70, 30 50 C 30 30, 50 0, 50 0 M50 100 C 50 100, 70 70, 70 50 C 70 30, 50 0, 50 0"
              stroke="#4A6E53"
              fill="none"
              strokeWidth="0.5"
            />
            <path
              d="M35 80 L 25 75 M65 80 L 75 75 M30 60 L 20 55 M70 60 L 80 55"
              stroke="#4A6E53"
              strokeWidth="0.5"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
