import { Metadata } from "./metadata";
import { Reveal } from "./reveal";

export function PhilosophySection() {
  return (
    <Reveal className="container kaffe-philosophy">
      <Metadata>Our Philosophy</Metadata>
      <blockquote>
        &ldquo;We believe that a space should breathe as deeply as those within
        it.&rdquo;
      </blockquote>
    </Reveal>
  );
}
