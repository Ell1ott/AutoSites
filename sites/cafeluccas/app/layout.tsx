import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";
import { SiteShell } from "@autosites/site-shell/SiteShell";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-dm-sans",
});

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-bricolage",
});

export const metadata: Metadata = {
  title: {
    default: "Café Luccas · Pizza & grill · Sorø",
    template: "%s · Café Luccas",
  },
  description:
    "Familievenlig pizza- og grillrestaurant i Sorø. Friske råvarer, frokosttilbud 11–15 og take away. Storgade 38.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da" className={`${dmSans.variable} ${bricolageGrotesque.variable}`}>
      <body className={dmSans.className}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
