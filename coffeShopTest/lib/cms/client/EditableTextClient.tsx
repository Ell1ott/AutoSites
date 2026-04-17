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
import { createPortal } from "react-dom";
import { revalidateContent, updateContent } from "../server/actions";
import type { CmsTextStyle } from "../types";
import { useCmsFieldRegistration, useEditableContext } from "./EditableProvider";
import { useToastStore } from "./Toast";

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

const FONT_SIZE_MIN = 0.5;
const FONT_SIZE_MAX = 6;
const FONT_SIZE_STEP = 0.05;
const LINE_HEIGHT_MIN = 0.8;
const LINE_HEIGHT_MAX = 3;
const LINE_HEIGHT_STEP = 0.05;
const FONT_SIZE_DEFAULT = 1;
const LINE_HEIGHT_DEFAULT = 1.4;

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

function styleToCss(s: CmsTextStyle | undefined): CSSProperties {
  if (!s) return {};
  const out: CSSProperties = {};
  if (typeof s.fontSize === "number") out.fontSize = `${s.fontSize}rem`;
  if (typeof s.lineHeight === "number") out.lineHeight = s.lineHeight;
  return out;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
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
  const toolbarRef = useRef<HTMLSpanElement | null>(null);
  // After mount, the DOM owns the contentEditable's content — React must
  // never re-apply innerHTML (it would wipe in-progress typing). Snapshotting
  // the initial HTML keeps `dangerouslySetInnerHTML.__html` stable forever.
  const initialHtml = useRef(initialText).current;
  // Re-entry guard: prevents endEditing from running twice when both the
  // document mousedown listener AND the editable's onBlur fire on the same
  // outside-click.
  const endingRef = useRef(false);
  // Mirror of savedText for cross-handler reads (style save, throttled text
  // save, endEditing all need the latest committed value without waiting for
  // a React render).
  const savedTextRef = useRef(initialText);
  // Track whether text was saved mid-edit without revalidation, so endEditing
  // knows to invalidate the cache once at the end.
  const textDirtyRef = useRef(false);
  const [savedText, setSavedText] = useState(initialText);
  const [textStyle, setTextStyle] = useState<CmsTextStyle | undefined>(
    initialStyle,
  );
  const savedStyleRef = useRef<CmsTextStyle | undefined>(initialStyle);
  // Track whether the style has been changed since the editable was focused,
  // so we can trigger a single cache revalidation on blur instead of one per
  // slider tick / button click.
  const styleDirtyRef = useRef(false);
  const [focused, setFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { pushToast } = useEditableContext();
  useCmsFieldRegistration(cmsKey, "text", savedText);

  async function persistStyle(next: CmsTextStyle | undefined) {
    const prev = savedStyleRef.current;
    if (sameStyle(prev, next)) return;
    savedStyleRef.current = next;
    styleDirtyRef.current = true;
    const payload: { text: string; style?: CmsTextStyle } = {
      text: savedTextRef.current,
    };
    if (next && (next.fontSize !== undefined || next.lineHeight !== undefined)) {
      payload.style = next;
    }
    try {
      // Skip cache revalidation here — the local state already reflects the
      // change, and revalidating on every tick would refresh the whole route.
      // We invalidate once on blur (see onBlur).
      await updateContent(cmsKey, "text", payload, { revalidate: false });
    } catch (err) {
      pushToast({
        kind: "error",
        message: err instanceof Error ? err.message : "Save failed.",
      });
      savedStyleRef.current = prev;
      setTextStyle(prev);
    }
  }

  function sameStyle(a: CmsTextStyle | undefined, b: CmsTextStyle | undefined) {
    const af = a?.fontSize, al = a?.lineHeight;
    const bf = b?.fontSize, bl = b?.lineHeight;
    return af === bf && al === bl;
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

  // -------------------- throttled text saves while editing --------------------
  // Save at most once every TEXT_SAVE_INTERVAL_MS, leading + trailing edge.
  // Each save skips revalidation so the route doesn't refresh as you type;
  // endEditing fires the single invalidation at the end of the session.
  const TEXT_SAVE_INTERVAL_MS = 1200;
  const lastTextSaveAt = useRef(0);
  const trailingTextTimer = useRef<number | null>(null);

  async function persistText(next: string) {
    if (next === savedTextRef.current) return;
    const prev = savedTextRef.current;
    savedTextRef.current = next;
    setSavedText(next);
    textDirtyRef.current = true;
    lastTextSaveAt.current = Date.now();
    const payload: { text: string; style?: CmsTextStyle } = { text: next };
    const cs = savedStyleRef.current;
    if (cs && (cs.fontSize !== undefined || cs.lineHeight !== undefined)) {
      payload.style = cs;
    }
    try {
      await updateContent(cmsKey, "text", payload, { revalidate: false });
    } catch (err) {
      pushToast({
        kind: "error",
        message: err instanceof Error ? err.message : "Save failed.",
      });
      savedTextRef.current = prev;
      setSavedText(prev);
    }
  }

  function scheduleTextSave() {
    const el = ref.current;
    if (!el) return;
    const next = sanitizeHtml(el.innerHTML);
    if (next === savedTextRef.current) return;
    const elapsed = Date.now() - lastTextSaveAt.current;
    if (trailingTextTimer.current !== null) {
      window.clearTimeout(trailingTextTimer.current);
      trailingTextTimer.current = null;
    }
    if (elapsed >= TEXT_SAVE_INTERVAL_MS) {
      void persistText(next);
    } else {
      trailingTextTimer.current = window.setTimeout(() => {
        trailingTextTimer.current = null;
        const el2 = ref.current;
        if (!el2) return;
        void persistText(sanitizeHtml(el2.innerHTML));
      }, TEXT_SAVE_INTERVAL_MS - elapsed);
    }
  }

  function cancelPendingTextSave() {
    if (trailingTextTimer.current !== null) {
      window.clearTimeout(trailingTextTimer.current);
      trailingTextTimer.current = null;
    }
  }

  useEffect(() => {
    return () => cancelPendingTextSave();
  }, []);

  /** End the editing session: commit text & style, close the toolbar. */
  async function endEditing() {
    if (endingRef.current) return;
    endingRef.current = true;
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

    cancelPendingTextSave();
    el.classList.remove("cms-editing");
    setFocused(false);
    setExpanded(false);

    const next = sanitizeHtml(el.innerHTML);
    const textChanged = next !== savedTextRef.current;

    if (!textChanged) {
      // Text matches what's saved. If anything was written without
      // revalidation during this session, invalidate the cache once now.
      if (styleDirtyRef.current || textDirtyRef.current) {
        styleDirtyRef.current = false;
        textDirtyRef.current = false;
        void revalidateContent(cmsKey).catch(() => {});
      }
      return;
    }

    const prev = savedTextRef.current;
    styleDirtyRef.current = false; // text save below revalidates everything
    textDirtyRef.current = false;
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

  function onBlur(e: FocusEvent<HTMLElement>) {
    // Focus moving into the toolbar shouldn't end the session — the document
    // mousedown listener (below) handles real outside-clicks.
    const related = e.relatedTarget as HTMLElement | null;
    if (related?.closest(".cms-rich-toolbar")) return;
    void endEditing();
  }

  function onFocus(e: FocusEvent<HTMLElement>) {
    e.currentTarget.classList.add("cms-editing");
    setFocused(true);
    endingRef.current = false; // new session — allow endEditing again
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

  const [toolbarPos, setToolbarPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (focused && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      // Anchor toolbar by its bottom edge just above the text.
      // CSS translateY(-100%) makes it grow upward when expanded.
      setToolbarPos({
        top: rect.top - 8 + window.scrollY,
        left: rect.left + window.scrollX,
      });
    } else {
      setToolbarPos(null);
    }
  }, [focused]);

  // Single source of truth for "click outside ends the session". Browser blur
  // events alone are unreliable here because focus can sit on a toolbar input
  // (number field) — the editable's own onBlur never fires when the user
  // then clicks somewhere unrelated.
  useEffect(() => {
    if (!focused) return;
    function onDocDown(e: MouseEvent) {
      const t = e.target as Node | null;
      if (!t) return;
      if (ref.current?.contains(t)) return;
      if (toolbarRef.current?.contains(t)) return;
      void endEditing();
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
    // endEditing is stable enough — it reads from refs and current state via
    // the closure captured at this effect's run; that's fine because we
    // re-run the effect whenever `focused` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const cls = [className, "cms-editable"].filter(Boolean).join(" ");

  const liveStyle: CSSProperties = { ...style, ...styleToCss(textStyle) };

  const toolbar =
    toolbarPos &&
    createPortal(
      <span
        ref={toolbarRef}
        className={`cms-rich-toolbar${expanded ? " cms-rich-toolbar--expanded" : ""}`}
        contentEditable={false}
        style={{ top: toolbarPos.top, left: toolbarPos.left }}
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
            className={expanded ? "cms-rich-toolbar__more is-active" : "cms-rich-toolbar__more"}
            onClick={() => setExpanded((v) => !v)}
          >
            ⋯
          </button>
        </span>
      </span>,
      document.body,
    );

  return createElement(
    "span",
    { style: { display: "contents" } },
    toolbar,
    createElement(tag, {
      ref,
      className: cls,
      style: liveStyle,
      contentEditable: true,
      suppressContentEditableWarning: true,
      spellCheck: true,
      dangerouslySetInnerHTML: { __html: initialHtml },
      onBlur,
      onFocus,
      onKeyDown,
      onPaste,
      onInput: scheduleTextSave,
      "data-cms-key": cmsKey,
    }),
  );
}

type ExpandedRowsProps = {
  style: CmsTextStyle | undefined;
  onChange: (
    field: "fontSize" | "lineHeight",
    value: number | undefined,
    commit?: boolean,
  ) => void;
  onReset: () => void;
};

function ExpandedRows({ style, onChange, onReset }: ExpandedRowsProps) {
  const fontSet = style?.fontSize !== undefined;
  const lhSet = style?.lineHeight !== undefined;

  return (
    <>
      <StyleNumberRow
        label="size"
        field="fontSize"
        value={style?.fontSize ?? FONT_SIZE_DEFAULT}
        isSet={fontSet}
        min={FONT_SIZE_MIN}
        max={FONT_SIZE_MAX}
        step={FONT_SIZE_STEP}
        bumpStep={FONT_SIZE_STEP * 2}
        onChange={onChange}
      />
      <span className="cms-rich-toolbar__row cms-rich-toolbar__row--style">
        <StyleNumberInline
          label="line"
          field="lineHeight"
          value={style?.lineHeight ?? LINE_HEIGHT_DEFAULT}
          isSet={lhSet}
          min={LINE_HEIGHT_MIN}
          max={LINE_HEIGHT_MAX}
          step={LINE_HEIGHT_STEP}
          bumpStep={LINE_HEIGHT_STEP * 2}
          onChange={onChange}
        />
        <button
          type="button"
          title="Reset to default"
          className="cms-rich-toolbar__reset"
          onClick={onReset}
          disabled={!fontSet && !lhSet}
        >
          ↺
        </button>
      </span>
    </>
  );
}

type StyleRowProps = {
  label: string;
  field: "fontSize" | "lineHeight";
  value: number;
  isSet: boolean;
  min: number;
  max: number;
  step: number;
  bumpStep: number;
  onChange: (
    field: "fontSize" | "lineHeight",
    value: number | undefined,
    commit?: boolean,
  ) => void;
};

/** A row with: label, − button, editable number, + button. */
function StyleNumberRow(props: StyleRowProps) {
  return (
    <span className="cms-rich-toolbar__row cms-rich-toolbar__row--style">
      <StyleNumberInline {...props} />
    </span>
  );
}

/** Inline cluster: label, − button, editable number, + button, slider. */
function StyleNumberInline({
  label,
  field,
  value,
  isSet,
  min,
  max,
  step,
  bumpStep,
  onChange,
}: StyleRowProps) {
  const [draft, setDraft] = useState<string>(value.toFixed(2));

  // Re-sync the draft when the committed value changes from outside (e.g. +/−,
  // slider drag, reset, or another field's edit).
  useEffect(() => {
    setDraft(value.toFixed(2));
  }, [value]);

  function commit(raw: string) {
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed)) {
      setDraft(value.toFixed(2));
      return;
    }
    const v = round2(clamp(parsed, min, max));
    setDraft(v.toFixed(2));
    onChange(field, v, true);
  }

  function bump(delta: number) {
    const v = round2(clamp(value + delta, min, max));
    setDraft(v.toFixed(2));
    onChange(field, v, true);
  }

  function previewSlider(raw: string) {
    const v = round2(clamp(parseFloat(raw), min, max));
    onChange(field, v, false); // local preview only
  }

  function commitSlider(raw: string) {
    const v = round2(clamp(parseFloat(raw), min, max));
    onChange(field, v, true);
  }

  return (
    <>
      <span className="cms-rich-toolbar__label">{label}</span>
      <button
        type="button"
        title={`Decrease ${label}`}
        onClick={() => bump(-bumpStep)}
      >
        −
      </button>
      <input
        type="number"
        className={`cms-rich-toolbar__num${isSet ? "" : " is-default"}`}
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setDraft(value.toFixed(2));
            (e.target as HTMLInputElement).blur();
          }
        }}
        aria-label={`${label} number`}
      />
      <button
        type="button"
        title={`Increase ${label}`}
        onClick={() => bump(bumpStep)}
      >
        +
      </button>
      <input
        type="range"
        className="cms-rich-toolbar__slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => previewSlider(e.target.value)}
        onMouseUp={(e) => commitSlider((e.target as HTMLInputElement).value)}
        onTouchEnd={(e) => commitSlider((e.target as HTMLInputElement).value)}
        onKeyUp={(e) => commitSlider((e.target as HTMLInputElement).value)}
        aria-label={`${label} slider`}
      />
    </>
  );
}
