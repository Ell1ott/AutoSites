"use client";

import { type FormEvent, useState } from "react";

type ContactFormProps = {
  light?: boolean;
};

export function ContactForm({ light = false }: ContactFormProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const fieldClass = light ? "wok-field wok-field-light" : "wok-field";

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    window.setTimeout(() => setStatus("sent"), 600);
  }

  if (status === "sent") {
    return (
      <p className={light ? "text-white" : "text-brand-red"} role="status">
        Tak — vi vender tilbage snarest.
      </p>
    );
  }

  return (
    <form
      className={`grid grid-cols-2 gap-6 ${light ? "text-white" : ""}`}
      onSubmit={onSubmit}
    >
      <label className="sr-only" htmlFor="contact-name">
        Navn
      </label>
      <input
        id="contact-name"
        name="name"
        required
        className={`${fieldClass} col-span-2`}
        placeholder="Navn"
        type="text"
        autoComplete="name"
      />
      <label className="sr-only" htmlFor="contact-email">
        E-mail
      </label>
      <input
        id="contact-email"
        name="email"
        required
        className={`${fieldClass} col-span-1`}
        placeholder="E-mail"
        type="email"
        autoComplete="email"
      />
      <label className="sr-only" htmlFor="contact-phone">
        Telefon
      </label>
      <input
        id="contact-phone"
        name="phone"
        className={`${fieldClass} col-span-1`}
        placeholder="Telefon"
        type="tel"
        autoComplete="tel"
      />
      <label className="sr-only" htmlFor="contact-message">
        Besked
      </label>
      <textarea
        id="contact-message"
        name="message"
        required
        className={`${fieldClass} col-span-2 resize-none`}
        placeholder="Skriv din besked her"
        rows={3}
      />
      <button
        type="submit"
        className="wok-btn col-span-2 mt-4"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sender…" : "Send →"}
      </button>
    </form>
  );
}
