import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/components/providers"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SideNav } from "@/components/shell/side-nav"
import { TopBar } from "@/components/shell/top-bar"
import { SelectionPill } from "@/components/shell/selection-pill"
import { cn } from "@/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", geist.variable)}
    >
      <body>
        <ThemeProvider>
          <Providers>
            <TooltipProvider>
              <div className="flex h-screen w-screen overflow-hidden">
                <SideNav />
                <div className="flex flex-1 flex-col min-w-0">
                  <TopBar />
                  <main className="flex-1 overflow-auto">{children}</main>
                </div>
                <SelectionPill />
              </div>
            </TooltipProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
