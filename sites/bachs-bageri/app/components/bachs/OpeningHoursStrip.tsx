export function OpeningHoursStrip() {
  return (
    <div className="hours-strip" role="region" aria-label="Åbningstider">
      <div className="container hours-strip-inner">
        <span className="hours-strip-label">Åbent</span>
        <span className="hours-strip-times">
          Man–fre 06:00–17:30 · Lør 06:00–13:00 · Søn 06:00–13:00
        </span>
      </div>
    </div>
  );
}
