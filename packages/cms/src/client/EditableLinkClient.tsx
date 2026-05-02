"use client";

import {
  useState,
  type CSSProperties,
  type FormEvent,
  type MouseEvent,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import { updateContent } from "../server/actions";
import { useCmsFieldRegistration, useEditableContext } from "./EditableProvider";
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
  const { pushToast } = useEditableContext();
  useCmsFieldRegistration(cmsKey, "link", value);

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
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <Element
          {...(as === "a"
            ? { href: value.href, target, rel }
            : { type: "button" as const })}
          className={cls}
          style={style}
          onClick={onActivate}
          data-cms-key={cmsKey}
        >
          {value.label}
        </Element>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          className="cms-link-popover"
          side="bottom"
          align="start"
          sideOffset={6}
          updatePositionStrategy="always"
        >
          <form onSubmit={onSave}>
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
