import type { Metadata } from "next";
import "./globals.css";
import { SiteShell } from "@autosites/site-shell/SiteShell";

export const metadata: Metadata = {
  title: "Test03",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
