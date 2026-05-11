"use client"

import { useCallback, useRef } from "react"

import { useSelectionStore } from "@/lib/store/selection"
import type { SlimLead } from "@/lib/types"

/**
 * Shared checkbox-click handler used by all three list views. Implements:
 *
 *   - Plain click          → toggle this row.
 *   - ⌘/Ctrl+click         → toggle (same as plain — convention from Linear).
 *   - Shift+click          → add every row between the last clicked id and
 *                            the current one to the selection.
 *
 * `rows` MUST be the currently-rendered (filtered + sorted) list so range
 * selection matches the visible order. The hook stores the most-recent
 * clicked id in a ref scoped to one mount of the page.
 */
export function useRowSelection(rows: SlimLead[]) {
  const toggle = useSelectionStore((s) => s.toggle)
  const addMany = useSelectionStore((s) => s.addMany)
  const lastClickedId = useRef<string | null>(null)

  const onCheckboxClick = useCallback(
    (placeId: string, e: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) => {
      const last = lastClickedId.current
      if (e.shiftKey && last && last !== placeId) {
        const ids = rows.map((r) => r.place_id)
        const a = ids.indexOf(last)
        const b = ids.indexOf(placeId)
        if (a !== -1 && b !== -1) {
          const [lo, hi] = a < b ? [a, b] : [b, a]
          addMany(ids.slice(lo, hi + 1))
          lastClickedId.current = placeId
          return
        }
      }
      // Plain / cmd / ctrl click — toggle this one and remember it.
      toggle(placeId)
      lastClickedId.current = placeId
    },
    [rows, toggle, addMany],
  )

  return { onCheckboxClick }
}
