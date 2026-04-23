import { LoginForm } from "./login-form";

export const metadata = {
  title: "CMS sign in",
  robots: { index: false, follow: false },
};

export default function CmsLoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        background: "var(--bg, #faf7f2)",
        color: "var(--text, #1a1a1a)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "22rem",
          display: "grid",
          gap: "1rem",
        }}
      >
        <div style={{ letterSpacing: "0.08em", fontSize: "0.72rem", textTransform: "uppercase", opacity: 0.6 }}>
          CMS · admin sign in
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
