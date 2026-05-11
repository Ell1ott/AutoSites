// Persistent UI state (side-nav pin, etc.) backed by localStorage.

"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type LeadsViewMode = "smallGrid" | "bigGrid" | "table"

type UiState = {
  /**
   * Whether the side-nav rail is pinned open (and therefore expanded). The
   * field name reflects historical naming in the storage key — UX-wise it
   * doubles as "expanded".
   */
  sideNavPinned: boolean
  setSideNavPinned: (v: boolean) => void

  /** Selected layout on the Leads page. Persists across reloads. */
  viewMode: LeadsViewMode
  setViewMode: (v: LeadsViewMode) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sideNavPinned: false,
      setSideNavPinned: (v) => set({ sideNavPinned: v }),

      viewMode: "smallGrid",
      setViewMode: (v) => set({ viewMode: v }),
    }),
    {
      name: "admin-next.ui",
      partialize: (state) => ({
        sideNavPinned: state.sideNavPinned,
        viewMode: state.viewMode,
      }),
    },
  ),
)
