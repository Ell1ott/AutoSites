import type { Metadata } from "next";
import { cormorant, outfit } from "./fonts";
import "./globals.css";
import { SiteShell } from "@autosites/site-shell/SiteShell";

export const metadata: Metadata = {
  title: "Solo Pizza Næstved — Autentisk italiensk pizza",
  description:
    "Solo Pizza i Næstved Storcenter — pizza, pasta, burgers og mere. Bestil via Wolt eller kom forbi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da" className={`${cormorant.variable} ${outfit.variable}`}>
      <body className={outfit.className}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
