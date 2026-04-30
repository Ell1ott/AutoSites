"use client";

import { useState } from "react";
import { appendListItem } from "../server/actions";
import { useToastStore } from "./Toast";

type Props = {
  listKey: string;
  fallbackIds: string[];
};

export function EditableListAddButton({ listKey, fallbackIds }: Props) {
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (busy) return;
    setBusy(true);
    try {
      await appendListItem(listKey, fallbackIds);
    } catch (err) {
      useToastStore.push({
        kind: "error",
        message: err instanceof Error ? err.message : "Add failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="cms-list-add"
      title="Add new item"
      onClick={handleAdd}
      disabled={busy}
    >
      <span aria-hidden>+</span>
      <span className="cms-list-add__label">Add item</span>
    </button>
  );
}
