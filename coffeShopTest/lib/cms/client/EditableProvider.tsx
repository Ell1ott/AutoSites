"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CmsKind } from "../types";
import { Toaster, useToastStore } from "./Toast";
import "./editable.css";

export type CmsFieldSnapshot = {
  kind: CmsKind;
  value: unknown;
};

type EditableContextValue = {
  editMode: true;
  pushToast: typeof useToastStore.push;
  pageFields: ReadonlyMap<string, CmsFieldSnapshot>;
  registerCmsField: (cmsKey: string, snapshot: CmsFieldSnapshot) => void;
  unregisterCmsField: (cmsKey: string) => void;
};

const EditableContext = createContext<EditableContextValue | null>(null);

function truncateMiddle(s: string, max = 96): string {
  if (s.length <= max) return s;
  const inner = max - 1;
  const head = Math.ceil(inner / 2);
  const tail = Math.floor(inner / 2);
  return `${s.slice(0, head)}…${s.slice(s.length - tail)}`;
}

/** One-line display / copy: no JSON wrappers for text. */
function formatCmsFieldCompact(kind: CmsKind, value: unknown): string {
  if (kind === "text" && value && typeof value === "object" && "text" in value) {
    const t = String((value as { text: string }).text);
    return t.replace(/\s+/g, " ").trim();
  }
  if (kind === "link" && value && typeof value === "object") {
    const v = value as { href: string; label: string };
    return `${v.label} → ${v.href}`;
  }
  if (kind === "image" && value && typeof value === "object") {
    const v = value as { src: string; alt: string };
    return `${v.alt}: ${truncateMiddle(v.src)}`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

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

/** Registers this field’s path and current value for the “page data” inspector. */
export function useCmsFieldRegistration(
  cmsKey: string,
  kind: CmsKind,
  value: unknown,
) {
  const { registerCmsField, unregisterCmsField } = useEditableContext();
  useEffect(() => {
    const snapshot: CmsFieldSnapshot =
      kind === "text" && typeof value === "string"
        ? { kind: "text", value: { text: value } }
        : { kind, value };
    registerCmsField(cmsKey, snapshot);
    return () => unregisterCmsField(cmsKey);
  }, [cmsKey, kind, value, registerCmsField, unregisterCmsField]);
}

export function EditableProviderClient({ children }: { children: ReactNode }) {
  const [pageFields, setPageFields] = useState(
    () => new Map<string, CmsFieldSnapshot>(),
  );

  const registerCmsField = useCallback(
    (cmsKey: string, snapshot: CmsFieldSnapshot) => {
      setPageFields((prev) => {
        const next = new Map(prev);
        next.set(cmsKey, snapshot);
        return next;
      });
    },
    [],
  );

  const unregisterCmsField = useCallback((cmsKey: string) => {
    setPageFields((prev) => {
      const next = new Map(prev);
      next.delete(cmsKey);
      return next;
    });
  }, []);

  const value = useMemo<EditableContextValue>(
    () => ({
      editMode: true,
      pushToast: useToastStore.push,
      pageFields,
      registerCmsField,
      unregisterCmsField,
    }),
    [pageFields, registerCmsField, unregisterCmsField],
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
  const [open, setOpen] = useState(false);

  return (
    <>
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
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            className="cms-banner-btn"
            onClick={() => setOpen(true)}
          >
            Page data
          </button>
          <a
            href="/?edit=0"
            style={{ color: "#fafafa", textDecoration: "underline" }}
          >
            Exit edit mode
          </a>
        </div>
      </div>
      {open ? <PageDataOverlay onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function PageDataOverlay({ onClose }: { onClose: () => void }) {
  const { pageFields, pushToast } = useEditableContext();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sorted = useMemo(() => {
    return [...pageFields.entries()].sort(([a], [b]) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [pageFields]);

  const copyText = useMemo(() => {
    return sorted
      .map(
        ([path, snap]) =>
          `${path}: ${formatCmsFieldCompact(snap.kind, snap.value)}`,
      )
      .join("\n");
  }, [sorted]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyText);
      pushToast({ kind: "success", message: "Copied page data" });
    } catch {
      pushToast({ kind: "error", message: "Could not copy to clipboard" });
    }
  }

  return (
    <div
      className="cms-page-data-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cms-page-data-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cms-page-data-panel">
        <div className="cms-page-data-header">
          <h2 id="cms-page-data-title" className="cms-page-data-title">
            Page data
          </h2>
          <div className="cms-page-data-actions">
            <button type="button" className="cms-page-data-copy" onClick={handleCopy}>
              Copy all
            </button>
            <button
              type="button"
              className="cms-page-data-close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
        <p className="cms-page-data-hint">
          Paths and values on this page (one line per field when you copy).
        </p>
        <ul className="cms-page-data-list">
          {sorted.length === 0 ? (
            <li className="cms-page-data-empty">No fields registered yet.</li>
          ) : (
            sorted.map(([path, snap]) => {
              const compact = formatCmsFieldCompact(snap.kind, snap.value);
              return (
                <li key={path} className="cms-page-data-row">
                  <span className="cms-page-data-path">{path}</span>
                  <span className="cms-page-data-sep" aria-hidden>
                    {": "}
                  </span>
                  <span className="cms-page-data-compact" title={compact}>
                    {compact}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
