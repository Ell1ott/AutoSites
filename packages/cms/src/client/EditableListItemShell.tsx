"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import * as Toolbar from "@radix-ui/react-toolbar";
import { moveListItem, removeListItem } from "../server/actions";
import { useToastStore } from "./Toast";

type Props = {
  listKey: string;
  itemId: string;
  fallbackIds: string[];
  isFirst: boolean;
  isLast: boolean;
  children: ReactNode;
};

export function EditableListItemShell({
  listKey,
  itemId,
  fallbackIds,
  isFirst,
  isLast,
  children,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Outside-click and Escape both cancel the delete-confirm state.
  useEffect(() => {
    if (!confirming) return;
    function onDocDown(e: MouseEvent) {
      const t = e.target as Node | null;
      if (!t) return;
      if (wrapperRef.current?.contains(t)) return;
      setConfirming(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setConfirming(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [confirming]);

  async function handleMove(direction: "up" | "down") {
    if (busy) return;
    setBusy(true);
    try {
      await moveListItem(listKey, itemId, direction, fallbackIds);
    } catch (err) {
      useToastStore.push({
        kind: "error",
        message: err instanceof Error ? err.message : "Move failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (busy) return;
    setBusy(true);
    try {
      await removeListItem(listKey, itemId, fallbackIds);
    } catch (err) {
      useToastStore.push({
        kind: "error",
        message: err instanceof Error ? err.message : "Delete failed.",
      });
      setBusy(false);
    }
    // On success the server revalidates the cache and the item disappears
    // from the rerender — no need to clear `busy`.
  }

  return (
    <div
      ref={wrapperRef}
      className={`cms-list-item${confirming ? " cms-list-item--confirming" : ""}`}
    >
      {children}
      <Toolbar.Root
        className="cms-list-controls"
        contentEditable={false}
        aria-label="List item controls"
      >
        {confirming ? (
          <>
            <Toolbar.Button
              type="button"
              className="cms-list-btn cms-list-btn--confirm"
              title="Confirm delete"
              onClick={handleDelete}
              disabled={busy}
            >
              ✓
            </Toolbar.Button>
            <Toolbar.Button
              type="button"
              className="cms-list-btn"
              title="Cancel"
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              ✕
            </Toolbar.Button>
          </>
        ) : (
          <>
            <Toolbar.Button
              type="button"
              className="cms-list-btn"
              title="Move up"
              onClick={() => handleMove("up")}
              disabled={busy || isFirst}
            >
              ↑
            </Toolbar.Button>
            <Toolbar.Button
              type="button"
              className="cms-list-btn"
              title="Move down"
              onClick={() => handleMove("down")}
              disabled={busy || isLast}
            >
              ↓
            </Toolbar.Button>
            <Toolbar.Button
              type="button"
              className="cms-list-btn cms-list-btn--delete"
              title="Delete"
              onClick={() => setConfirming(true)}
              disabled={busy}
            >
              ×
            </Toolbar.Button>
          </>
        )}
      </Toolbar.Root>
    </div>
  );
}
