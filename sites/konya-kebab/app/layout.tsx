import type { Metadata } from "next";
import { bricolage, figtree } from "./fonts";
import "./globals.css";
import { SiteShell } from "@autosites/site-shell/SiteShell";

export const metadata: Metadata = {
  title: "Konya Kebab — Tyrkisk restaurant i Næstved",
  description:
    "Konya Kebab på Ramsherred 25 i Næstved. Tyrkisk restaurant med kebab, durum og grillmad. 4,3/5 på Google (342 anmeldelser). Ring 55 77 87 98.",
  other: {
    "geo.region": "DK-82",
    "geo.placename": "Næstved",
    "geo.position": "55.230760599999996;11.761835699999999",
    ICBM: "55.230760599999996, 11.761835699999999",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: "Konya Kebab",
  servesCuisine: "Turkish",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Ramsherred 25",
    addressLocality: "Næstved",
    postalCode: "4700",
    addressCountry: "DK",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 55.230760599999996,
    longitude: 11.761835699999999,
  },
  telephone: "+4555778798",
  url: "https://maps.google.com/?cid=10937926852505944707",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.3",
    reviewCount: "342",
    bestRating: "5",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Sunday"],
      opens: "11:00",
      closes: "20:30",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Friday", "Saturday"],
      opens: "11:00",
      closes: "05:00",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da" className={`${bricolage.variable} ${figtree.variable}`}>
      <body className={figtree.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
