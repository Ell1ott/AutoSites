type ExperienceCardProps = {
  title: string;
  meta: string;
  imageUrl: string;
};

export function ExperienceCard({ title, meta, imageUrl }: ExperienceCardProps) {
  return (
    <div className="card">
      <div
        className="card-img"
        style={{ backgroundImage: `url('${imageUrl}')` }}
        role="img"
        aria-label={title}
      />
      <div className="card-info">
        <div className="card-title">{title}</div>
        <div className="card-meta">{meta}</div>
      </div>
    </div>
  );
}
