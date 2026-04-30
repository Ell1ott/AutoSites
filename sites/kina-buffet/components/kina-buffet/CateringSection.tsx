import { SectionLabel } from "./SectionLabel";

export function CateringSection() {
  return (
    <section className="grid-container" id="catering">
      <SectionLabel title="Catering & selskaber" meta="Store som små arrangementer" />
      <div className="catering-visual">
        <div
          className="notched-frame"
          style={{
            height: "400px",
            background:
              "url('https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=1200') center/cover",
          }}
          role="img"
          aria-label="Catering og buffet til arrangementer"
        />
      </div>
      <div className="catering-copy">
        <p style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.2, marginBottom: "20px" }}>
          Få Kina Buffet ud af huset. Vi leverer catering til både små og store grupper — lige fra
          firmafrokost til festmiddage og receptioner.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <span style={{ fontWeight: 900, color: "var(--red)" }}>01.</span>
            <h5 style={{ textTransform: "uppercase", fontWeight: 900, marginTop: "5px" }}>
              Fleksible løsninger
            </h5>
            <p style={{ fontSize: "0.7rem", opacity: 0.7 }}>
              Vi tilpasser omfanget efter dit selskab og lokalet.
            </p>
          </div>
          <div>
            <span style={{ fontWeight: 900, color: "var(--red)" }}>02.</span>
            <h5 style={{ textTransform: "uppercase", fontWeight: 900, marginTop: "5px" }}>
              Kendt kvalitet
            </h5>
            <p style={{ fontSize: "0.7rem", opacity: 0.7 }}>
              Samme vægt på smag, udvalg og tryghed som på restauranten (Elite Smiley).
            </p>
          </div>
        </div>
        <p style={{ marginTop: "1.5rem", fontSize: "0.85rem", opacity: 0.85 }}>
          Kontakt os på{" "}
          <a href="tel:+4597181888" style={{ color: "var(--red)", fontWeight: 700 }}>
            97 18 18 88
          </a>{" "}
          eller via{" "}
          <a href="https://kinabuffet.com/" style={{ color: "var(--red)", fontWeight: 700 }}>
            kinabuffet.com
          </a>{" "}
          for at høre mere.
        </p>
      </div>
    </section>
  );
}
