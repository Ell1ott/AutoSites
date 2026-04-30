"use client";

import { homemadeApple } from "@/app/fonts";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { LogoBlock } from "./LogoBlock";

const TIME_OPTIONS = [
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
] as const;

const GUEST_OPTIONS = ["2 personer", "4 personer", "6 – 10 personer", "Større selskab (10+)"] as const;

function defaultDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function BookingPortal() {
  const pathname = usePathname();
  const [date, setDate] = useState(defaultDateString);
  const [time, setTime] = useState<string>(TIME_OPTIONS[4]);
  const [guests, setGuests] = useState<string>(GUEST_OPTIONS[1]);
  const [status, setStatus] = useState<"idle" | "success">("idle");

  const minDate = useMemo(() => defaultDateString(), []);

  const scrollToTakeaway = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== "/") return;
    e.preventDefault();
    document.getElementById("takeaway")?.scrollIntoView({ behavior: "smooth" });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    await new Promise((r) => window.setTimeout(r, 600));
    setStatus("success");
  }

  return (
    <section className="grid-container" id="reserve" style={{ paddingTop: 0 }}>
      <div className="notched-frame portal-section">
        <div className="portal-content">
          <div
            className={homemadeApple.className}
            style={{
              marginBottom: "10px",
              color: "var(--gold)",
              fontSize: "1.5rem",
            }}
          >
            Reserver dit bord
          </div>
          <h3>Bestil bord</h3>
          <p style={{ opacity: 0.85, marginTop: "20px", fontSize: "0.95rem", lineHeight: 1.6 }}>
            Bordbestilling kan altid gøres via <strong>Bestil bord</strong> på{" "}
            <Link href="https://kinabuffet.com/" style={{ color: "var(--gold)" }}>
              kinabuffet.com
            </Link>
            . Her kan du også sende os en forespørgsel — perfekt til fødselsdage og firmaarrangementer i
            hjertet af Ikast.
          </p>
          <p style={{ marginTop: "16px" }}>
            <Link
              href="https://kinabuffet.com/"
              className="btn-primary"
              style={{
                display: "inline-block",
                textAlign: "center",
                textDecoration: "none",
                padding: "16px 28px",
                fontSize: "0.95rem",
              }}
            >
              Gå til booking på kinabuffet.com
            </Link>
          </p>

          <div style={{ marginTop: "40px", display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <LogoBlock
              main="Buffet"
              sub="16:30 — 22:00 · hver dag"
              mainStyle={{ color: "white", fontSize: "1rem" }}
              subStyle={{ color: "var(--gold)" }}
            />
            <LogoBlock
              main="Plads til"
              sub="150+ gæster"
              mainStyle={{ color: "white", fontSize: "1rem" }}
              subStyle={{ color: "var(--gold)" }}
            />
          </div>
        </div>

        <form className="booking-form" onSubmit={handleSubmit} noValidate>
          <p style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "var(--gold)", marginBottom: "16px" }}>
            Demo — hurtig forespørgsel (ingen garanti)
          </p>
          <div className="form-group">
            <label className="form-label" htmlFor="reserve-date">
              Dato &amp; tid
            </label>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                id="reserve-date"
                type="date"
                name="date"
                min={minDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                aria-required
              />
              <select
                id="reserve-time"
                name="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                aria-label="Tidspunkt"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reserve-guests">
              Antal gæster
            </label>
            <select
              id="reserve-guests"
              name="guests"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
            >
              {GUEST_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary" type="submit">
            Send forespørgsel
          </button>

          <div style={{ marginTop: "15px", textAlign: "center" }}>
            <Link
              href="/#takeaway"
              scroll={pathname === "/"}
              onClick={scrollToTakeaway}
              style={{
                color: "var(--gold)",
                textTransform: "uppercase",
                fontSize: "0.6rem",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Takeaway i stedet →
            </Link>
          </div>

          {status === "success" && (
            <p
              role="status"
              style={{
                marginTop: "16px",
                textAlign: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--cream)",
              }}
            >
              Tak — vi har modtaget din demo-forespørgsel. Bekræft venligst på kinabuffet.com for endelig
              booking.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
