// Root mount for the bottom-right job overlay. Renders one JobToastCard per
// tracked job, stacked vertically with the newest at the bottom.
//
// Mounted once in app/layout.tsx. Any callsite can push to it via
// `useTrackJob()(jobId, { title, kind })` after starting a job.

"use client"

import * as React from "react"

import { JobToastCard } from "./job-toast-card"
import { useJobToasterStore } from "@/lib/store/job-toaster"

export function JobToaster(): React.JSX.Element | null {
  const toasts = useJobToasterStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      aria-label="Background jobs"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <JobToastCard jobId={t.id} title={t.title} kind={t.kind} />
        </div>
      ))}
    </div>
  )
}
