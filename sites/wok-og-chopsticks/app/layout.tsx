import type { Metadata } from "next";
import { inter, playfair } from "./fonts";
import "./globals.css";
import { SiteShell } from "@autosites/site-shell/SiteShell";

export const metadata: Metadata = {
  title: {
    default: "Wok og Chopsticks — Kinesisk restaurant i Næstved",
    template: "%s · Wok og Chopsticks",
  },
  description:
    "Wok og Chopsticks på Axeltorv 9E i Næstved. Frokost, aftenbuffet, à la carte, menuer og buffet ud af huset. Selskaber op til 140 personer. Tlf. +45 55 77 73 79.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da" className={`${playfair.variable} ${inter.variable}`}>
      <body className={`${inter.className} bg-white text-brand-dark`}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
