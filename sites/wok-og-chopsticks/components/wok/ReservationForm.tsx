"use client";

import { type FormEvent, useState } from "react";

export function ReservationForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    window.setTimeout(() => setStatus("sent"), 600);
  }

  if (status === "sent") {
    return (
      <p className="text-brand-red font-medium" role="status">
        Tak — vi har modtaget din reservationsforespørgsel og bekræfter snarest.
      </p>
    );
  }

  return (
    <form className="grid grid-cols-2 gap-6" onSubmit={onSubmit}>
      <label className="col-span-1 sr-only" htmlFor="res-name">
        Dit navn
      </label>
      <input
        id="res-name"
        name="name"
        required
        className="wok-field col-span-1"
        placeholder="Dit navn"
        type="text"
        autoComplete="name"
      />
      <label className="sr-only" htmlFor="res-guests">
        Antal gæster
      </label>
      <select
        id="res-guests"
        name="guests"
        className="wok-field col-span-1"
        defaultValue="2"
      >
        <option value="1">1 person</option>
        <option value="2">2 personer</option>
        <option value="3">3 personer</option>
        <option value="4">4+ personer</option>
      </select>
      <label className="sr-only" htmlFor="res-date">
        Dato
      </label>
      <input
        id="res-date"
        name="date"
        required
        className="wok-field col-span-1"
        type="date"
      />
      <label className="sr-only" htmlFor="res-time">
        Tidspunkt
      </label>
      <select
        id="res-time"
        name="time"
        className="wok-field col-span-1"
        defaultValue="20:00"
      >
        <option value="17:00">17:00</option>
        <option value="18:00">18:00</option>
        <option value="19:00">19:00</option>
        <option value="20:00">20:00</option>
        <option value="21:00">21:00</option>
      </select>
      <div className="col-span-2 mt-4">
        <button
          type="submit"
          className="wok-btn w-fit"
          disabled={status === "sending"}
        >
          {status === "sending" ? "Booker…" : "Book nu"}
        </button>
      </div>
    </form>
  );
}
