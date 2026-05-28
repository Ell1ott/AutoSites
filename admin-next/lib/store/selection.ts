// Ephemeral lead selection state. Not persisted — selection resets on reload.
//
// We use an immutable replace pattern (new Set on every mutation) so React /
// Zustand's shallow equality check sees a fresh reference. The naive
// `state.selected.add(id); return { selected: state.selected }` pattern would
// not re-render subscribers.

"use client"

import { create } from "zustand"

type SelectionState = {
  selected: Set<string> // place_ids
  /**
   * Name of the AI task chosen in the SelectionPill. Shared globally so the
   * leads overview can highlight rows that don't satisfy the task's deps even
   * before the user clicks Run.
   */
  taskName: string
  toggle: (id: string) => void
  add: (id: string) => void
  addMany: (ids: string[]) => void
  remove: (id: string) => void
  clear: () => void
  has: (id: string) => boolean
  size: () => number
  setTaskName: (name: string) => void
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selected: new Set<string>(),
  taskName: "",
  setTaskName: (name) =>
    set((s) => (s.taskName === name ? s : { taskName: name })),
  toggle: (id) =>
    set((s) => {
      const next = new Set(s.selected)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { selected: next }
    }),
  add: (id) =>
    set((s) => {
      if (s.selected.has(id)) return s
      const next = new Set(s.selected)
      next.add(id)
      return { selected: next }
    }),
  addMany: (ids) =>
    set((s) => {
      const next = new Set(s.selected)
      for (const id of ids) next.add(id)
      return { selected: next }
    }),
  remove: (id) =>
    set((s) => {
      if (!s.selected.has(id)) return s
      const next = new Set(s.selected)
      next.delete(id)
      return { selected: next }
    }),
  clear: () =>
    set((s) =>
      s.selected.size === 0 && s.taskName === ""
        ? s
        : { selected: new Set<string>(), taskName: "" },
    ),
  has: (id) => get().selected.has(id),
  size: () => get().selected.size,
}))

// Convenience selectors. Re-render when the underlying set reference changes.
export const useSelectionSize = (): number =>
  useSelectionStore((s) => s.selected.size)

export const useSelectionIds = (): Set<string> =>
  useSelectionStore((s) => s.selected)
