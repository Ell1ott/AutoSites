"use client";

import { homemadeApple } from "@/app/fonts";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { LogoBlock } from "./LogoBlock";

const TIME_OPTIONS = ["18:30", "19:00", "19:30", "20:00"] as const;
const GUEST_OPTIONS = [
  "2 People",
  "4 People",
  "6-10 People",
  "Large Event (10+)",
] as const;

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
  const [time, setTime] = useState<string>(TIME_OPTIONS[0]);
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
            The Buffet Awaits
          </div>
          <h3>Secure Your Table.</h3>
          <p style={{ opacity: 0.8, marginTop: "20px", fontSize: "0.9rem" }}>
            Large groups, corporate events, or family dinners. Kina offers the space and the flavor for
            every occasion.
          </p>

          <div style={{ marginTop: "40px", display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <LogoBlock
              main="Lunch Buffet"
              sub="11:00 — 15:00"
              mainStyle={{ color: "white", fontSize: "1rem" }}
              subStyle={{ color: "var(--gold)" }}
            />
            <LogoBlock
              main="Dinner Buffet"
              sub="17:00 — 22:00"
              mainStyle={{ color: "white", fontSize: "1rem" }}
              subStyle={{ color: "var(--gold)" }}
            />
          </div>
        </div>

        <form className="booking-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="reserve-date">
              Date &amp; Time
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
                aria-label="Reservation time"
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
              Guests
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
            Confirm Reservation
          </button>

          <div id="takeaway" style={{ marginTop: "15px", textAlign: "center" }}>
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
              Order Takeaway Instead →
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
              Thank you — we&apos;ll confirm your reservation by email shortly.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
