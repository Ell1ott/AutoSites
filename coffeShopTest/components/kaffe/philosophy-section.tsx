import { EditableText } from "@/lib/cms";
import { Reveal } from "./reveal";

export function PhilosophySection() {
  return (
    <Reveal className="container kaffe-philosophy">
      <span className="kaffe-metadata">
        <EditableText
          cmsKey="home.philosophy.label"
          fallback="Our Philosophy"
        />
      </span>
      <blockquote>
        <EditableText
          cmsKey="home.philosophy.quote"
          fallback="“We believe that a space should breathe as deeply as those within it.”"
        />
      </blockquote>
    </Reveal>
  );
}
