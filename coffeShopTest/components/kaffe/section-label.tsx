import { Metadata } from "./metadata";

type SectionLabelProps = {
  left: string;
  right: string;
};

export function SectionLabel({ left, right }: SectionLabelProps) {
  return (
    <div className="kaffe-section-label">
      <Metadata>{left}</Metadata>
      <Metadata>{right}</Metadata>
    </div>
  );
}
