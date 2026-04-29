type SectionLabelProps = {
  title: string;
  meta: string;
};

export function SectionLabel({ title, meta }: SectionLabelProps) {
  return (
    <div className="section-label">
      <h2>{title}</h2>
      <div className="card-meta">{meta}</div>
    </div>
  );
}
