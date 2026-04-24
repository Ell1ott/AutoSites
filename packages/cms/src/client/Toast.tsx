"use client";

import { useSyncExternalStore } from "react";

export type Toast = {
  id: string;
  kind: "success" | "error" | "info";
  message: string;
};

type Listener = (toasts: Toast[]) => void;

const store = {
  toasts: [] as Toast[],
  listeners: new Set<Listener>(),
};

function emit() {
  for (const l of store.listeners) l(store.toasts);
}

function subscribe(l: Listener) {
  store.listeners.add(l);
  return () => {
    store.listeners.delete(l);
  };
}

function getSnapshot() {
  return store.toasts;
}

const emptySnapshot: Toast[] = [];
function getServerSnapshot() {
  return emptySnapshot;
}

export const useToastStore = {
  push: (toast: Omit<Toast, "id"> & { id?: string }): { id: string } => {
    const id = toast.id ?? crypto.randomUUID();
    store.toasts = [...store.toasts, { ...toast, id }];
    emit();
    if (toast.kind !== "error") {
      setTimeout(() => useToastStore.dismiss(id), 2500);
    }
    return { id };
  },
  dismiss: (id: string) => {
    store.toasts = store.toasts.filter((t) => t.id !== id);
    emit();
  },
  // Compat shape used by EditableProvider (selector-style): pass a selector
  // that picks a field — currently only `push` is needed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _: undefined as any,
};

// Convenience selector-style export so callers can do:
//   const pushToast = useToastStore((s) => s.push)
// matching common Zustand-ish patterns without adding a dep.
export function useToastStoreSelector<T>(
  selector: (store: typeof useToastStore) => T,
): T {
  // No subscription needed — the object is stable for the lifetime of the
  // module, so just read it once.
  return selector(useToastStore);
}

export function Toaster() {
  const toasts = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "1rem",
        right: "1rem",
        zIndex: 9500,
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
        pointerEvents: "none",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            pointerEvents: "auto",
            padding: "0.55rem 0.85rem",
            background:
              t.kind === "error"
                ? "rgba(180,30,30,0.96)"
                : t.kind === "info"
                  ? "rgba(40,40,40,0.94)"
                  : "rgba(25,95,45,0.94)",
            color: "#fafafa",
            fontSize: "0.8rem",
            letterSpacing: "0.02em",
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span>{t.message}</span>
          {t.kind === "error" ? (
            <button
              type="button"
              onClick={() => useToastStore.dismiss(t.id)}
              style={{
                marginLeft: "0.25rem",
                background: "transparent",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                fontSize: "0.9rem",
                lineHeight: 1,
              }}
              aria-label="Dismiss"
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
