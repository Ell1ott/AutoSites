// Persistent UI state backed by localStorage.

"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type LeadsViewMode = "smallGrid" | "bigGrid" | "table" | "map"

type UiState = {
  /** Whether the side nav shows labels (expanded) or icons only. */
  sideNavExpanded: boolean
  setSideNavExpanded: (v: boolean) => void

  /** Selected layout on the Leads page. Persists across reloads. */
  viewMode: LeadsViewMode
  setViewMode: (v: LeadsViewMode) => void

  /** Leads map: field key that drives pin color. */
  mapColorField: string
  setMapColorField: (key: string) => void

  /**
   * Leads table: column id → true when hidden. Ids: `screenshot`, static keys
   * (`name`, …), and `dynamic.{key}` for dynamic fields.
   */
  leadTableColumnHidden: Record<string, boolean>
  setLeadTableColumnHidden: (columnId: string, hidden: boolean) => void
  /**
   * Leads table: left-to-right order of draggable data columns (`name`, …,
   * `dynamic.*`). Checkbox and Preview stay fixed on the left. Empty array
   * means derive order from defaults until the user drags.
   */
  leadTableColumnOrder: string[]
  setLeadTableColumnOrder: (columnIdsInOrder: string[]) => void
  /**
   * Leads table: column id → width (px). Same ids as sortable data columns
   * (`name`, `dynamic.*`, `data.*`). Checkbox/screenshot use fixed layout sizes.
   */
  leadTableColumnSizing: Record<string, number>
  setLeadTableColumnSizing: (next: Record<string, number>) => void
  /**
   * Opt-in columns from raw `places.data` (Google JSON). Id → true means shown
   * in the leads table; omitted/false means hidden.
   */
  leadTableDataColumnShown: Record<string, boolean>
  setLeadTableDataColumnShown: (columnId: string, shown: boolean) => void
  resetLeadTableColumns: () => void

  /** Last lead opened on /leads — session only, not persisted. */
  selectedLeadId: string | null
  setSelectedLeadId: (id: string | null) => void
  /** When true, return to /leads/:id instead of the side panel. Session only. */
  leadDetailFullScreen: boolean
  setLeadDetailFullScreen: (v: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sideNavExpanded: true,
      setSideNavExpanded: (v) => set({ sideNavExpanded: v }),

      viewMode: "smallGrid",
      setViewMode: (v) => set({ viewMode: v }),

      mapColorField: "lead_score",
      setMapColorField: (key) => set({ mapColorField: key }),

      leadTableColumnHidden: { contacts: true },
      setLeadTableColumnHidden: (columnId, hidden) =>
        set((s) => {
          const next = { ...s.leadTableColumnHidden }
          if (hidden) next[columnId] = true
          else delete next[columnId]
          return { leadTableColumnHidden: next }
        }),

      leadTableColumnOrder: [],
      setLeadTableColumnOrder: (columnIdsInOrder) =>
        set({ leadTableColumnOrder: [...columnIdsInOrder] }),

      leadTableColumnSizing: {},
      setLeadTableColumnSizing: (next) =>
        set({ leadTableColumnSizing: { ...next } }),

      leadTableDataColumnShown: {},
      setLeadTableDataColumnShown: (columnId, shown) =>
        set((s) => {
          const next = { ...s.leadTableDataColumnShown }
          if (shown) next[columnId] = true
          else delete next[columnId]
          return { leadTableDataColumnShown: next }
        }),

      resetLeadTableColumns: () =>
        set({
          leadTableColumnHidden: { contacts: true },
          leadTableDataColumnShown: {},
          leadTableColumnOrder: [],
          leadTableColumnSizing: {},
        }),

      selectedLeadId: null,
      setSelectedLeadId: (id) => set({ selectedLeadId: id }),
      leadDetailFullScreen: false,
      setLeadDetailFullScreen: (v) => set({ leadDetailFullScreen: v }),
    }),
    {
      name: "admin-next.ui",
      partialize: (state) => ({
        sideNavExpanded: state.sideNavExpanded,
        viewMode: state.viewMode,
        mapColorField: state.mapColorField,
        leadTableColumnHidden: state.leadTableColumnHidden,
        leadTableColumnOrder: state.leadTableColumnOrder,
        leadTableColumnSizing: state.leadTableColumnSizing,
        leadTableDataColumnShown: state.leadTableDataColumnShown,
      }),
    },
  ),
)
