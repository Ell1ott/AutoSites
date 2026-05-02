"use client";

import {
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ClipboardEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import { updateContent } from "../server/actions";
import type { CmsTextStyle } from "../types";
import { useCmsFieldRegistration, useEditableContext } from "./EditableProvider";
import { useTrack } from "../client-logger";
import { ExpandedRows, sameStyle, styleToCss } from "./StyleControls";

type EditableTextClientProps = {
  cmsKey: string;
  initialText: string;
  initialStyle?: CmsTextStyle;
  tag: string;
  className?: string;
  style?: CSSProperties;
  before?: ReactNode;
  after?: ReactNode;
};

/** Strip everything except allowed inline formatting tags. */
function sanitizeHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const tag = (node as Element).tagName.toLowerCase();
    const inner = Array.from(node.childNodes).map(walk).join("");
    if (["b", "strong", "i", "em", "br"].includes(tag)) {
      return tag === "br" ? "<br>" : `<${tag}>${inner}</${tag}>`;
    }
    return inner;
  }

  return walk(div).replace(/\s+$/, "");
}

export function EditableTextClient({
  cmsKey,
  initialText,
  initialStyle,
  tag,
  className,
  style,
  before,
  after,
}: EditableTextClientProps) {
  const ref = useRef<HTMLElement | null>(null);
  // The contentEditable is intentionally uncontrolled — the DOM owns its
  // content. We set innerHTML once on mount (see effect below) and never
  // pass dangerouslySetInnerHTML, so React has no way to overwrite typing
  // when the parent server component re-renders after a save.
  const hasInitializedRef = useRef(false);
  // Mirror of savedText for cross-handler reads (style save, throttled text
  // save, endEditing all need the latest committed value without waiting for
  // a React render).
  const savedTextRef = useRef(initialText);
  const [savedText, setSavedText] = useState(initialText);
  const [textStyle, setTextStyle] = useState<CmsTextStyle | undefined>(
    initialStyle,
  );
  const savedStyleRef = useRef<CmsTextStyle | undefined>(initialStyle);
  const [focused, setFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { pushToast } = useEditableContext();
  const track = useTrack();
  useCmsFieldRegistration(cmsKey, "text", savedText);

  async function persistStyle(next: CmsTextStyle | undefined) {
    const prev = savedStyleRef.current;
    if (sameStyle(prev, next)) return;
    savedStyleRef.current = next;
    const payload: { text: string; style?: CmsTextStyle } = {
      text: savedTextRef.current,
    };
    if (next && (next.fontSize !== undefined || next.lineHeight !== undefined)) {
      payload.style = next;
    }
    try {
      await updateContent(cmsKey, "text", payload);
    } catch (err) {
      pushToast({
        kind: "error",
        message: err instanceof Error ? err.message : "Save failed.",
      });
      savedStyleRef.current = prev;
      setTextStyle(prev);
    }
  }

  /** Apply a style change to local state (live preview) and optionally save. */
  function updateStyleField(
    field: "fontSize" | "lineHeight",
    value: number | undefined,
    commit = true,
  ) {
    setTextStyle((prev) => {
      const next: CmsTextStyle = { ...(prev ?? {}) };
      if (value === undefined) {
        delete next[field];
      } else {
        next[field] = value;
      }
      const cleaned: CmsTextStyle | undefined =
        next.fontSize === undefined && next.lineHeight === undefined
          ? undefined
          : next;
      if (commit) void persistStyle(cleaned);
      return cleaned;
    });
  }

  function resetStyle() {
    setTextStyle(undefined);
    void persistStyle(undefined);
  }

  // -------------------- text autosave while editing --------------------
  // Every TEXT_SAVE_INTERVAL_MS while focused, check the DOM for changes and
  // save if anything differs from what's already saved. Each save revalidates
  // the CMS cache tag so other requests see fresh content (contentEditable
  // stays uncontrolled so local typing is not wiped by re-renders).
  const TEXT_SAVE_INTERVAL_MS = 1200;

  async function persistText(next: string) {
    if (next === savedTextRef.current) return;
    const prev = savedTextRef.current;
    savedTextRef.current = next;
    setSavedText(next);
    const payload: { text: string; style?: CmsTextStyle } = { text: next };
    const cs = savedStyleRef.current;
    if (cs && (cs.fontSize !== undefined || cs.lineHeight !== undefined)) {
      payload.style = cs;
    }
    try {
      await updateContent(cmsKey, "text", payload);
    } catch (err) {
      pushToast({
        kind: "error",
        message: err instanceof Error ? err.message : "Save failed.",
      });
      savedTextRef.current = prev;
      setSavedText(prev);
    }
  }

  useEffect(() => {
    if (!focused) return;
    const id = window.setInterval(() => {
      const el = ref.current;
      if (!el) return;
      const next = sanitizeHtml(el.innerHTML);
      if (next !== savedTextRef.current) void persistText(next);
    }, TEXT_SAVE_INTERVAL_MS);
    return () => window.clearInterval(id);
    // persistText captures refs only — safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  // Set the initial HTML once — this is the ONLY place React/JS touches the
  // contentEditable's content. After this effect runs, the DOM is the source
  // of truth until endEditing reads from it to save.
  useEffect(() => {
    const el = ref.current;
    if (!el || hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    el.innerHTML = initialText;
    // initialText is the prop at first render; we deliberately don't re-run
    // this effect when the prop changes (that would wipe in-progress typing).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** End the editing session: commit text & style, close the toolbar. */
  async function endEditing() {
    const el = ref.current;
    if (!el) return;

    // Commit any focused toolbar input (e.g. a half-typed number) so its
    // own onBlur fires before we tear the toolbar down.
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      active !== el &&
      active !== document.body
    ) {
      active.blur();
    }

    el.classList.remove("cms-editing");
    setFocused(false);
    setExpanded(false);

    const next = sanitizeHtml(el.innerHTML);
    const textChanged = next !== savedTextRef.current;

    if (!textChanged) return;

    const prev = savedTextRef.current;
    savedTextRef.current = next;
    setSavedText(next);
    const payload: { text: string; style?: CmsTextStyle } = { text: next };
    const currentStyle = savedStyleRef.current;
    if (
      currentStyle &&
      (currentStyle.fontSize !== undefined ||
        currentStyle.lineHeight !== undefined)
    ) {
      payload.style = currentStyle;
    }
    try {
      await updateContent(cmsKey, "text", payload);
    } catch (err) {
      pushToast({
        kind: "error",
        message: err instanceof Error ? err.message : "Save failed.",
      });
      el.innerHTML = prev;
      savedTextRef.current = prev;
      setSavedText(prev);
    }
  }

  function onFocus(e: FocusEvent<HTMLElement>) {
    e.currentTarget.classList.add("cms-editing");
    setFocused(true);
    track("cms_field_focused", { key: cmsKey, kind: "text" });
  }

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.currentTarget.innerHTML = savedText;
      (e.currentTarget as HTMLElement).blur();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLElement>) {
    e.preventDefault();
    // Prefer HTML paste so bold/italic survives, then sanitize
    const html = e.clipboardData.getData("text/html");
    if (html) {
      const clean = sanitizeHtml(html);
      document.execCommand("insertHTML", false, clean);
    } else {
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    }
  }

  function execFormat(cmd: string) {
    document.execCommand(cmd, false);
    ref.current?.focus();
  }

  const cls = [className, "cms-editable"].filter(Boolean).join(" ");

  const liveStyle: CSSProperties = { ...style, ...styleToCss(textStyle) };

  const editable = createElement(tag, {
    ref,
    className: cls,
    style: liveStyle,
    contentEditable: true,
    suppressContentEditableWarning: true,
    spellCheck: true,
    // Intentionally NO dangerouslySetInnerHTML — see the mount effect above.
    // React must never re-apply innerHTML or it will wipe user typing when
    // the parent server component re-renders after a save.
    onFocus,
    onKeyDown,
    onPaste,
    "data-cms-key": cmsKey,
  });

  return (
    <Popover.Root
      open={focused}
      onOpenChange={(next) => {
        if (!next) void endEditing();
      }}
    >
      <Popover.Anchor asChild>{editable}</Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          className={`cms-rich-toolbar${expanded ? " cms-rich-toolbar--expanded" : ""}`}
          side="top"
          align="start"
          sideOffset={8}
          updatePositionStrategy="always"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => {
            // Clicks/selections inside the editable itself must not dismiss
            // the toolbar — the user is positioning a caret or extending a
            // selection so they can apply B/I.
            const target = e.detail.originalEvent.target as Node | null;
            if (target && ref.current?.contains(target)) e.preventDefault();
          }}
          onFocusOutside={(e) => {
            const target = e.target as Node | null;
            if (target && ref.current?.contains(target)) e.preventDefault();
          }}
          onMouseDown={(e) => {
            // Keep contentEditable focus when clicking buttons. Allow inputs
            // (e.g. the editable number field) to receive focus normally.
            if ((e.target as HTMLElement).tagName !== "INPUT") {
              e.preventDefault();
            }
          }}
        >
          {expanded ? (
            <ExpandedRows
              style={textStyle}
              onChange={updateStyleField}
              onReset={resetStyle}
            />
          ) : null}
          <span className="cms-rich-toolbar__row">
            <button
              type="button"
              title="Bold (⌘B)"
              onClick={() => execFormat("bold")}
            >
              B
            </button>
            <button
              type="button"
              title="Italic (⌘I)"
              onClick={() => execFormat("italic")}
            >
              <i>I</i>
            </button>
            <button
              type="button"
              title={expanded ? "Hide style options" : "More options"}
              aria-pressed={expanded}
              className={
                expanded
                  ? "cms-rich-toolbar__more is-active"
                  : "cms-rich-toolbar__more"
              }
              onClick={() => setExpanded((v) => !v)}
            >
              ⋯
            </button>
          </span>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
