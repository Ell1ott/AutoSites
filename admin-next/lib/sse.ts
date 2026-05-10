// Resumable EventSource wrapper for the AutoSites Pi backend.
//
// The backend's /jobs/:id/stream replays job_logs rows with seq > since on
// connect, then streams new events live. Heartbeat comment lines fire every
// 15s on the server side. We add a watchdog that closes & reconnects if no
// event arrives in heartbeatTimeoutMs (default 30000), plus exponential
// backoff capped at 5s on errors.
//
// IMPORTANT: EventSource cannot set an Authorization header. We pass the
// backend token as a `?token=...` query param (the backend accepts it as a
// fallback). This file is browser-only — components that use it must be
// "use client".

"use client"

import { useEffect, useRef } from "react"

export type EventStreamOptions<T> = {
  /** Path relative to NEXT_PUBLIC_PI_URL, e.g. "/jobs/abc/stream". */
  url: string
  /** Optional sessionStorage key to persist lastSeq across reloads. */
  storageKey?: string
  /** Server-side filter applied via ?level= */
  level?: "info" | "warn" | "error"
  onEvent: (e: T) => void
  onError?: (err: unknown) => void
  onOpen?: () => void
  /** Force reconnect if no event in this window (default 30000). */
  heartbeatTimeoutMs?: number
}

const DEFAULT_HEARTBEAT_TIMEOUT_MS = 30_000
const MAX_BACKOFF_MS = 5_000
const INITIAL_BACKOFF_MS = 250

function getBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_PI_URL ?? ""
  return base.replace(/\/+$/, "")
}

function readPersistedSeq(storageKey?: string): number {
  if (!storageKey) return 0
  if (typeof sessionStorage === "undefined") return 0
  const raw = sessionStorage.getItem(storageKey)
  if (!raw) return 0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

function writePersistedSeq(storageKey: string | undefined, seq: number): void {
  if (!storageKey) return
  if (typeof sessionStorage === "undefined") return
  try {
    sessionStorage.setItem(storageKey, String(seq))
  } catch {
    // Storage full / disabled — silently ignore.
  }
}

export class EventStream<T extends { seq: number }> {
  private opts: EventStreamOptions<T>
  private es: EventSource | null = null
  private _lastSeq: number
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private backoff: number = INITIAL_BACKOFF_MS
  private stopped: boolean = true

  constructor(opts: EventStreamOptions<T>) {
    this.opts = opts
    this._lastSeq = readPersistedSeq(opts.storageKey)
  }

  get lastSeq(): number {
    return this._lastSeq
  }

  start(): void {
    if (!this.stopped) return
    this.stopped = false
    this.connect()
  }

  stop(): void {
    this.stopped = true
    this.clearHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.es) {
      this.es.close()
      this.es = null
    }
  }

  // ---------- internals ----------

  private buildUrl(): string {
    const base = getBaseUrl()
    const absolute = this.opts.url.startsWith("http")
      ? this.opts.url
      : `${base}${this.opts.url}`
    const u = new URL(absolute, typeof window !== "undefined" ? window.location.href : "http://localhost")
    u.searchParams.set("since", String(this._lastSeq))
    if (this.opts.level) u.searchParams.set("level", this.opts.level)
    const token = process.env.NEXT_PUBLIC_BACKEND_TOKEN
    if (token) u.searchParams.set("token", token)
    return u.toString()
  }

  private connect(): void {
    if (this.stopped) return
    if (typeof EventSource === "undefined") {
      // Server-side render — bail. The hook is "use client" but a defensive guard.
      return
    }

    const url = this.buildUrl()
    let es: EventSource
    try {
      es = new EventSource(url)
    } catch (err) {
      this.opts.onError?.(err)
      this.scheduleReconnect()
      return
    }
    this.es = es

    es.onopen = () => {
      this.backoff = INITIAL_BACKOFF_MS
      this.resetHeartbeat()
      this.opts.onOpen?.()
    }

    es.onmessage = (msg) => {
      this.resetHeartbeat()
      let parsed: T
      try {
        parsed = JSON.parse(msg.data) as T
      } catch (err) {
        this.opts.onError?.(err)
        return
      }
      if (typeof parsed?.seq === "number" && parsed.seq > this._lastSeq) {
        this._lastSeq = parsed.seq
        writePersistedSeq(this.opts.storageKey, this._lastSeq)
      }
      try {
        this.opts.onEvent(parsed)
      } catch (err) {
        this.opts.onError?.(err)
      }
    }

    es.onerror = (err) => {
      this.opts.onError?.(err)
      // EventSource will attempt its own reconnect in some cases, but we want
      // deterministic control. Close and back off.
      es.close()
      if (this.es === es) this.es = null
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped) return
    if (this.reconnectTimer) return
    const delay = this.backoff
    this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  private resetHeartbeat(): void {
    this.clearHeartbeat()
    const ms = this.opts.heartbeatTimeoutMs ?? DEFAULT_HEARTBEAT_TIMEOUT_MS
    this.heartbeatTimer = setTimeout(() => {
      // No event in the window — force a reconnect.
      if (this.es) {
        this.es.close()
        this.es = null
      }
      this.scheduleReconnect()
    }, ms)
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
}

// -----------------------------------------------------------------------------
// React hook
// -----------------------------------------------------------------------------

export function useEventStream<T extends { seq: number }>(
  enabled: boolean,
  options: Omit<EventStreamOptions<T>, "onEvent" | "onOpen" | "onError"> & {
    onEvent: (e: T) => void
    onOpen?: () => void
    onError?: (err: unknown) => void
  },
): void {
  const streamRef = useRef<EventStream<T> | null>(null)
  // Stash the latest callbacks in refs so the effect doesn't re-run on every
  // identity change of onEvent.
  const onEventRef = useRef(options.onEvent)
  const onOpenRef = useRef(options.onOpen)
  const onErrorRef = useRef(options.onError)
  onEventRef.current = options.onEvent
  onOpenRef.current = options.onOpen
  onErrorRef.current = options.onError

  useEffect(() => {
    if (!enabled) return
    const stream = new EventStream<T>({
      url: options.url,
      storageKey: options.storageKey,
      level: options.level,
      heartbeatTimeoutMs: options.heartbeatTimeoutMs,
      onEvent: (e) => onEventRef.current(e),
      onOpen: () => onOpenRef.current?.(),
      onError: (err) => onErrorRef.current?.(err),
    })
    streamRef.current = stream
    stream.start()
    return () => {
      stream.stop()
      streamRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    options.url,
    options.storageKey,
    options.level,
    options.heartbeatTimeoutMs,
  ])
}
