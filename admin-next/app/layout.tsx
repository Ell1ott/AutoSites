import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/components/providers"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SideNav } from "@/components/shell/side-nav"
import { SelectionPill } from "@/components/shell/selection-pill"
import { JobToaster } from "@/components/jobs/job-toaster"
import { cn } from "@/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode
  modal: React.ReactNode
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
                <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
                  {children}
                </main>
                <SelectionPill />
                <JobToaster />
                {modal}
              </div>
            </TooltipProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
