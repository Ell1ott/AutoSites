"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "thanks">("idle");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("thanks");
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="cafe-newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="cafe-newsletter-email"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="EMAIL ADDRESS"
        className="newsletter-input"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status === "thanks") setStatus("idle");
        }}
      />
      {status === "thanks" ? (
        <p className="newsletter-thanks" role="status">
          You&apos;re in — see you for garlic bread.
        </p>
      ) : (
        <button type="submit" className="newsletter-submit">
          Subscribe
        </button>
      )}
    </form>
  );
}
