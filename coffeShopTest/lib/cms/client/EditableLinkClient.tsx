"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type MouseEvent,
} from "react";
import { updateContent } from "../server/actions";
import { useEditableContext } from "./EditableProvider";
import { useToastStore } from "./Toast";
import type { CmsLink } from "../types";

type EditableLinkClientProps = {
  cmsKey: string;
  initial: CmsLink;
  as?: "a" | "button";
  className?: string;
  style?: CSSProperties;
  target?: string;
  rel?: string;
};

export function EditableLinkClient({
  cmsKey,
  initial,
  as = "a",
  className,
  style,
  target,
  rel,
}: EditableLinkClientProps) {
  const [value, setValue] = useState<CmsLink>(initial);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const { pushToast } = useEditableContext();

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: globalThis.MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onActivate(e: MouseEvent) {
    e.preventDefault();
    setOpen((v) => !v);
  }

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const href = String(fd.get("href") ?? "").trim();
    const label = String(fd.get("label") ?? "").trim();
    if (!href || !label) {
      pushToast({ kind: "error", message: "href and label are required." });
      return;
    }
    const next: CmsLink = { href, label };
    const toast = pushToast({ kind: "info", message: "Saving…" });
    try {
      await updateContent(cmsKey, "link", next);
      setValue(next);
      setOpen(false);
      useToastStore.dismiss(toast.id);
      pushToast({ kind: "success", message: "Saved" });
    } catch (err) {
      useToastStore.dismiss(toast.id);
      pushToast({
        kind: "error",
        message: err instanceof Error ? err.message : "Save failed.",
      });
    }
  }

  const cls = [className, "cms-editable", "cms-editable--link"]
    .filter(Boolean)
    .join(" ");

  const Element = as === "button" ? "button" : "a";

  return (
    <span
      ref={rootRef}
      style={{ position: "relative", display: "inline-block" }}
      data-cms-key={cmsKey}
    >
      <Element
        {...(as === "a"
          ? { href: value.href, target, rel }
          : { type: "button" as const })}
        className={cls}
        style={style}
        onClick={onActivate}
      >
        {value.label}
      </Element>
      {open ? (
        <form
          className="cms-link-popover"
          style={{ top: "calc(100% + 0.4rem)", left: 0 }}
          onSubmit={onSave}
        >
          <label>
            <span>Label</span>
            <input name="label" defaultValue={value.label} autoFocus />
          </label>
          <label>
            <span>URL</span>
            <input name="href" defaultValue={value.href} />
          </label>
          <div className="cms-link-popover-actions">
            <button type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit">Save</button>
          </div>
        </form>
      ) : null}
    </span>
  );
}
