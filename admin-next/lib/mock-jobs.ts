// Fallback job list used when the backend is unreachable AND
// `NEXT_PUBLIC_USE_MOCKS=1`. Spans all five statuses so the Queue UI can be
// verified end-to-end without the Pi running.

import type { Job } from "./types"

const NOW = "2026-05-11T10:00:00.000Z"
const T_MINUS_2M = "2026-05-11T09:58:00.000Z"
const T_MINUS_10M = "2026-05-11T09:50:00.000Z"
const T_MINUS_30M = "2026-05-11T09:30:00.000Z"
const T_MINUS_1H = "2026-05-11T09:00:00.000Z"

export const MOCK_JOBS: Job[] = [
  {
    id: "job-running-001",
    kind: "ai_task",
    status: "running",
    args: { task: "describe_visuals" },
    progress: { done: 18, total: 50, eta_seconds: 240 },
    created_at: T_MINUS_10M,
    started_at: T_MINUS_10M,
  },
  {
    id: "job-running-002",
    kind: "fetch_leads",
    status: "running",
    args: { query: "bakery copenhagen" },
    progress: { done: 7, total: 12, eta_seconds: 90 },
    created_at: T_MINUS_2M,
    started_at: T_MINUS_2M,
  },
  {
    id: "job-queued-001",
    kind: "crawl",
    status: "queued",
    args: { url: "https://bachs.example.com" },
    created_at: NOW,
  },
  {
    id: "job-done-001",
    kind: "html_to_md",
    status: "done",
    args: { batch: 1 },
    progress: { done: 24, total: 24 },
    created_at: T_MINUS_1H,
    started_at: T_MINUS_1H,
    finished_at: T_MINUS_30M,
  },
  {
    id: "job-done-002",
    kind: "extract_contacts",
    status: "done",
    args: { place_ids: ["ChIJmock"] },
    progress: { done: 12, total: 12 },
    result: { extracted: 10, skipped: 2, missing: 0, failed: 0, places: 12 },
    created_at: T_MINUS_1H,
    started_at: T_MINUS_1H,
    finished_at: T_MINUS_30M,
  },
  {
    id: "job-failed-001",
    kind: "ai_task",
    status: "failed",
    args: { task: "design_prompt" },
    progress: { done: 3, total: 8 },
    error: "OpenAI rate limit exceeded",
    created_at: T_MINUS_1H,
    started_at: T_MINUS_1H,
    finished_at: T_MINUS_30M,
  },
  {
    id: "job-cancelled-001",
    kind: "fetch_leads",
    status: "cancelled",
    args: { query: "tattoo studio oslo" },
    progress: { done: 2, total: 20 },
    created_at: T_MINUS_1H,
    started_at: T_MINUS_1H,
    finished_at: T_MINUS_30M,
    cancel_requested: true,
  },
]
