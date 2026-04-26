import { EditableText } from "@autosites/cms/components";
import { Reveal } from "./reveal";

export function PhilosophySection() {
  return (
    <Reveal className="container kaffe-philosophy">
      <span className="kaffe-metadata">
        <EditableText
          cmsKey="home.philosophy.label"
          fallback="VORES FILOSOFI"
        />
      </span>
      <blockquote>
        <EditableText
          cmsKey="home.philosophy.quote"
          fallback="God kaffe, friskbagt kage og tid til at nyde det - det er det, Kaffe og mere handler om."
        />
      </blockquote>
    </Reveal>
  );
}
