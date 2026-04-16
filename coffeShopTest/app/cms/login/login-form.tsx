"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export function LoginForm() {
  const [state, action, isPending] = useActionState(signIn, undefined);

  return (
    <form action={action} style={{ display: "grid", gap: "0.75rem" }}>
      <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.85rem" }}>
        <span style={{ opacity: 0.7 }}>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          style={inputStyle}
        />
      </label>
      <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.85rem" }}>
        <span style={{ opacity: 0.7 }}>Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          style={inputStyle}
        />
      </label>
      {state?.error ? (
        <div style={{ fontSize: "0.8rem", color: "#c0392b" }}>
          {state.error}
        </div>
      ) : null}
      <button type="submit" disabled={isPending} style={buttonStyle}>
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.2)",
  background: "transparent",
  padding: "0.6rem 0.75rem",
  fontSize: "0.95rem",
  color: "inherit",
  borderRadius: 0,
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid currentColor",
  background: "transparent",
  padding: "0.65rem 1rem",
  fontSize: "0.85rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
  color: "inherit",
};
