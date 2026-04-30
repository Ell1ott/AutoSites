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
  title: "Bachs Bageri — Håndlavet i Aarhus",
  description:
    "Håndlavet brød og bagværk i Aarhus med surdej, lokale kornsorter og tålmodighed.",
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
