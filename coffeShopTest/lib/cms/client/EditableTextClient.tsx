"use client";

import {
  createElement,
  useRef,
  useState,
  type CSSProperties,
  type ClipboardEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { updateContent } from "../server/actions";
import { useEditableContext } from "./EditableProvider";
import { useToastStore } from "./Toast";

type EditableTextClientProps = {
  cmsKey: string;
  initialText: string;
  tag: string;
  className?: string;
  style?: CSSProperties;
  before?: ReactNode;
  after?: ReactNode;
};

export function EditableTextClient({
  cmsKey,
  initialText,
  tag,
  className,
  style,
  before,
  after,
}: EditableTextClientProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [saved, setSaved] = useState(initialText);
  const { pushToast } = useEditableContext();

  async function onBlur(e: FocusEvent<HTMLElement>) {
    const el = e.currentTarget;
    el.classList.remove("cms-editing");

    const next = (el.innerText ?? "").replace(/\s+$/g, "");
    if (next === saved) return;

    const prev = saved;
    setSaved(next);
    const toast = pushToast({ kind: "info", message: "Saving…" });
    try {
      await updateContent(cmsKey, "text", { text: next });
      useToastStore.dismiss(toast.id);
      pushToast({ kind: "success", message: "Saved" });
    } catch (err) {
      useToastStore.dismiss(toast.id);
      pushToast({
        kind: "error",
        message: err instanceof Error ? err.message : "Save failed.",
      });
      el.innerText = prev;
      setSaved(prev);
    }
  }

  function onFocus(e: FocusEvent<HTMLElement>) {
    e.currentTarget.classList.add("cms-editing");
  }

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.currentTarget.innerText = saved;
      (e.currentTarget as HTMLElement).blur();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }

  const cls = [className, "cms-editable"].filter(Boolean).join(" ");

  return createElement(
    tag,
    {
      ref,
      className: cls,
      style,
      contentEditable: true,
      suppressContentEditableWarning: true,
      spellCheck: true,
      onBlur,
      onFocus,
      onKeyDown,
      onPaste,
      "data-cms-key": cmsKey,
    },
    before,
    initialText,
    after,
  );
}

