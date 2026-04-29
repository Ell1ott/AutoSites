import { SectionLabel } from "./SectionLabel";

export function CateringSection() {
  return (
    <section className="grid-container" id="catering">
      <SectionLabel title="Catering & Events" meta="Full Service Setup" />
      <div className="catering-visual">
        <div
          className="notched-frame"
          style={{
            height: "400px",
            background:
              "url('https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=1200') center/cover",
          }}
          role="img"
          aria-label="Catering spread"
        />
      </div>
      <div className="catering-copy">
        <p style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.2, marginBottom: "20px" }}>
          Bring the Kina Buffet experience to your venue. From corporate lunches to wedding banquets.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <span style={{ fontWeight: 900, color: "var(--red)" }}>01.</span>
            <h5 style={{ textTransform: "uppercase", fontWeight: 900, marginTop: "5px" }}>
              Hot Stations
            </h5>
            <p style={{ fontSize: "0.7rem", opacity: 0.7 }}>Live cooking and serving.</p>
          </div>
          <div>
            <span style={{ fontWeight: 900, color: "var(--red)" }}>02.</span>
            <h5 style={{ textTransform: "uppercase", fontWeight: 900, marginTop: "5px" }}>
              Custom Menus
            </h5>
            <p style={{ fontSize: "0.7rem", opacity: 0.7 }}>Tailored to your needs.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
