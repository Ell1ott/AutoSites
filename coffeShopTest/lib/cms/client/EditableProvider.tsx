"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Toaster, useToastStore } from "./Toast";
import "./editable.css";

type EditableContextValue = {
  editMode: true;
  pushToast: typeof useToastStore.push;
};

const EditableContext = createContext<EditableContextValue | null>(null);

export function useEditableContext(): EditableContextValue {
  const ctx = useContext(EditableContext);
  if (!ctx) {
    throw new Error(
      "Editable components must be rendered inside <EditableProvider>. " +
        "This usually means getEditMode() returned true but the provider " +
        "wasn't mounted.",
    );
  }
  return ctx;
}

export function EditableProviderClient({ children }: { children: ReactNode }) {
  const value = useMemo<EditableContextValue>(
    () => ({ editMode: true, pushToast: useToastStore.push }),
    [],
  );

  return (
    <EditableContext.Provider value={value}>
      <EditModeBanner />
      {children}
      <Toaster />
    </EditableContext.Provider>
  );
}

function EditModeBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "0.4rem 0.75rem",
        background: "rgba(20,20,20,0.92)",
        color: "#fafafa",
        fontSize: "0.75rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        backdropFilter: "blur(8px)",
      }}
    >
      <span>Editing · changes save automatically</span>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <a
          href="/?edit=0"
          style={{ color: "#fafafa", textDecoration: "underline" }}
        >
          Exit edit mode
        </a>
      </div>
    </div>
  );
}
