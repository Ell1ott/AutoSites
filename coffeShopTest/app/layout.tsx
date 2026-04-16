import type { Metadata } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { EditableProvider } from "@/lib/cms/components/EditableProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["200", "300", "400"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Kaffe&mere — Nordisk Ro",
  description:
    "A curated ritual of slow-living through the lens of specialty coffee and architectural stillness.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${ebGaramond.variable}`}>
      <body>
        <Suspense fallback={null}>
          <EditableProvider>{children}</EditableProvider>
        </Suspense>
      </body>
    </html>
  );
}
