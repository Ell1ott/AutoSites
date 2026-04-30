import type { Metadata } from "next";
import { inter } from "./fonts";
import "./globals.css";
import "./kina-design.css";
import { SiteShell } from "@autosites/site-shell/SiteShell";

export const metadata: Metadata = {
  title: "Restaurant Kina Buffet — Byens største kinesiske restaurant | Ikast",
  description:
    "Buffet, a la carte, takeaway og catering i Ikast. Over 150 pladser, sushi, mongolsk grill og autentisk kinesisk mad. Book på kinabuffet.com.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da" className={inter.className}>
      <body style={{ margin: 0 }}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
