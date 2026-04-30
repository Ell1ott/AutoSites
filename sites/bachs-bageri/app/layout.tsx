import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";
import { SiteShell } from "@autosites/site-shell/SiteShell";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Bachs Bageri — Håndværksbageri i Tarm",
  description:
    "Lokalt bageri og konditori på Storegade i Tarm: brød, wienerbrød, kager, smørrebrød og sandwich — traditionsrigt siden 1932.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da">
      <body className={`${montserrat.variable} ${cormorant.variable}`}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
