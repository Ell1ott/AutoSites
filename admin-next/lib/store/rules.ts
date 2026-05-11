// Persistent auto-rule store backed by localStorage.
//
// TODO(backend-dep #2): swap localStorage persist for GET/POST/PATCH/DELETE
// /rules when backend adds the endpoints. The shape of each entry matches the
// future REST contract (`Rule` from lib/types.ts), so the swap will be a
// mechanical replacement of `persist(...)` with a TanStack Query mutation.

"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { Rule } from "@/lib/types"

type RulesState = {
  rules: Rule[]
  upsert: (rule: Rule) => void
  remove: (id: string) => void
  toggle: (id: string) => void
}

export const useRulesStore = create<RulesState>()(
  persist(
    (set) => ({
      rules: [],
      upsert: (rule) =>
        set((s) => {
          const idx = s.rules.findIndex((r) => r.id === rule.id)
          if (idx === -1) return { rules: [...s.rules, rule] }
          const next = s.rules.slice()
          next[idx] = rule
          return { rules: next }
        }),
      remove: (id) =>
        set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),
      toggle: (id) =>
        set((s) => ({
          rules: s.rules.map((r) =>
            r.id === id ? { ...r, enabled: !r.enabled } : r,
          ),
        })),
    }),
    {
      name: "admin-next.rules",
      partialize: (state) => ({ rules: state.rules }),
    },
  ),
)

/**
 * Stable id generator. Falls back to a non-cryptographic version when
 * `crypto.randomUUID` is unavailable (unlikely in modern browsers but cheap
 * insurance during SSR / older Node test environments).
 */
export function newRuleId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID()
  }
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}
