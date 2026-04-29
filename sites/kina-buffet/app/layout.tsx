import type { Metadata } from "next";
import { inter } from "./fonts";
import "./globals.css";
import "./kina-design.css";
import { SiteShell } from "@autosites/site-shell/SiteShell";

export const metadata: Metadata = {
  title: "KINA BUFFET — Authentic & Modern Asian Dining | Hero V3 Cinematic",
  description:
    "Authentic buffet, dim sum, catering & takeaway — Restaurant Kina in Metropolis City since 1994.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body style={{ margin: 0 }}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
