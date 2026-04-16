import Image from "next/image";
import { Metadata } from "./metadata";
import { spaceImageSrc } from "@/lib/kaffe-content";

export function SpaceSection() {
  return (
    <section className="container kaffe-space-section">
      <div className="kaffe-grid-3">
        <div className="kaffe-hero-image-wrap kaffe-space-image">
          <Image
            src={spaceImageSrc}
            alt="Cafe space"
            fill
            sizes="(max-width: 1440px) 66vw, 950px"
            className="object-cover [filter:grayscale(20%)_sepia(10%)]"
          />
        </div>
        <div className="kaffe-space-aside">
          <Metadata>Space</Metadata>
          <h2>Materials of Rest.</h2>
          <p>
            Our flagship store utilizes reclaimed oak beams and hand-applied lime
            wash to create a sensory vacuum.
          </p>
        </div>
      </div>
    </section>
  );
}
