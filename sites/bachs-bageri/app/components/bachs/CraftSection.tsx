import Image from "next/image";
import { SectionTag } from "./SectionTag";

const CRAFT_IMG =
  "https://images.unsplash.com/photo-1585478259715-876a6a81fc08?auto=format&fit=crop&q=80&w=1200";

export function CraftSection() {
  return (
    <section className="section-craft" id="processen" aria-labelledby="craft-heading">
      <div className="container grid-layout">
        <div className="craft-text">
          <SectionTag>Vores Filosofi</SectionTag>
          <h2 className="section-title" id="craft-heading">
            Kvalitet tager tid. Præcis 36 timer.
          </h2>
          <p>
            Vores signaturbrød koldhæver i halvandet døgn for at udvikle den
            dybe smag og den perfekte sprøde skorpe, som Bachs er kendt for.
          </p>
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
            <span className="craft-organic-label">100% Økologisk Mel</span>
          </div>
        </div>
        <div className="craft-image">
          <Image
            src={CRAFT_IMG}
            alt="Baker working with dough"
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
