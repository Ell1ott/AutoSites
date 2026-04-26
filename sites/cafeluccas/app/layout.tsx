import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";
import { SiteShell } from "@autosites/site-shell/SiteShell";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

export const metadata: Metadata = {
  title: "Café Luccas",
  description: "Sourdough pizza from our stone kiln to your table.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${bricolageGrotesque.variable}`}>
      <body className={dmSans.className}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
