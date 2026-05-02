"use client";

import {
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { updateContent } from "../server/actions";
import type { CmsTextStyle } from "../types";
import { useCmsFieldRegistration, useEditableContext } from "./EditableProvider";
import { useTrack } from "../client-logger";
import { ExpandedRows, sameStyle, styleToCss } from "./StyleControls";

type EditableRichTextClientProps = {
  cmsKey: string;
  initialHtml: string;
  initialStyle?: CmsTextStyle;
  tag: string;
  className?: string;
  style?: CSSProperties;
};

const TEXT_SAVE_INTERVAL_MS = 1200;

export function EditableRichTextClient({
  cmsKey,
  initialHtml,
  initialStyle,
  tag,
  className,
  style,
}: EditableRichTextClientProps) {
  const wrapperRef = useRef<HTMLElement | null>(null);
  const savedHtmlRef = useRef(initialHtml);
  const [savedHtml, setSavedHtml] = useState(initialHtml);
  const savedStyleRef = useRef<CmsTextStyle | undefined>(initialStyle);
  const [textStyle, setTextStyle] = useState<CmsTextStyle | undefined>(
    initialStyle,
  );
  const [focused, setFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { pushToast } = useEditableContext();
  const track = useTrack();
  useCmsFieldRegistration(cmsKey, "richText", savedHtml);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable extensions whose UI we don't expose — accidental input-rule
        // activation (e.g. typing "# " becoming a heading) would surprise users.
        // Keep: paragraph, hardBreak, bold, italic, undoRedo (history), document, text.
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
        link: false,
      }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: initialHtml,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "cms-editable-rich-pm" },
    },
  });

  async function persistHtml(next: string) {
    if (next === savedHtmlRef.current) return;
    const prev = savedHtmlRef.current;
    savedHtmlRef.current = next;
    setSavedHtml(next);
    const payload: { html: string; style?: CmsTextStyle } = { html: next };
    const cs = savedStyleRef.current;
    if (cs && (cs.fontSize !== undefined || cs.lineHeight !== undefined)) {
      payload.style = cs;
    }
    try {
      await updateContent(cmsKey, "richText", payload);
    } catch (err) {
      pushToast({
        kind: "error",
        message: err instanceof Error ? err.message : "Save failed.",
      });
      savedHtmlRef.current = prev;
      setSavedHtml(prev);
      editor?.commands.setContent(prev, { emitUpdate: false });
    }
  }

  async function persistStyle(next: CmsTextStyle | undefined) {
    const prev = savedStyleRef.current;
    if (sameStyle(prev, next)) return;
    savedStyleRef.current = next;
    const payload: { html: string; style?: CmsTextStyle } = {
      html: savedHtmlRef.current,
    };
    if (next && (next.fontSize !== undefined || next.lineHeight !== undefined)) {
      payload.style = next;
    }
    try {
      await updateContent(cmsKey, "richText", payload);
    } catch (err) {
      pushToast({
        kind: "error",
        message: err instanceof Error ? err.message : "Save failed.",
      });
      savedStyleRef.current = prev;
      setTextStyle(prev);
    }
  }

  function updateStyleField(
    field: "fontSize" | "lineHeight",
    value: number | undefined,
    commit = true,
  ) {
    setTextStyle((prev) => {
      const next: CmsTextStyle = { ...(prev ?? {}) };
      if (value === undefined) delete next[field];
      else next[field] = value;
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

  // Track focus on the editor view to drive the popover open state.
  useEffect(() => {
    if (!editor) return;
    const handleFocus = () => {
      setFocused(true);
      track("cms_field_focused", { key: cmsKey, kind: "richText" });
    };
    editor.on("focus", handleFocus);
    return () => {
      editor.off("focus", handleFocus);
    };
  }, [editor, cmsKey, track]);

  // Throttled autosave while focused: poll editor.getHTML() and persist if it
  // diverges from what's already saved. Mirrors EditableTextClient's pattern.
  useEffect(() => {
    if (!editor || !focused) return;
    const id = window.setInterval(() => {
      const next = editor.getHTML();
      if (next !== savedHtmlRef.current) void persistHtml(next);
    }, TEXT_SAVE_INTERVAL_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, focused]);

  async function endEditing() {
    if (!editor) return;
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      active !== document.body &&
      !editor.view.dom.contains(active)
    ) {
      active.blur();
    }
    setFocused(false);
    setExpanded(false);
    if (editor.isFocused) editor.commands.blur();
    const next = editor.getHTML();
    if (next !== savedHtmlRef.current) await persistHtml(next);
  }

  function applyLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href ?? "";
    const url = window.prompt("Link URL (leave empty to remove)", previous);
    if (url === null) return; // cancelled
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  }

  const cls = [className, "cms-editable", "cms-editable-rich"]
    .filter(Boolean)
    .join(" ");
  const liveStyle: CSSProperties = { ...style, ...styleToCss(textStyle) };

  const wrapper = createElement(
    tag,
    {
      ref: wrapperRef,
      className: cls,
      style: liveStyle,
      "data-cms-key": cmsKey,
    },
    <EditorContent editor={editor} />,
  );

  return (
    <Popover.Root
      open={focused}
      onOpenChange={(next) => {
        if (!next) void endEditing();
      }}
    >
      <Popover.Anchor asChild>{wrapper}</Popover.Anchor>
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
            const target = e.detail.originalEvent.target as Node | null;
            const editorDom = editor?.view.dom;
            if (target && editorDom && editorDom.contains(target)) {
              e.preventDefault();
            }
          }}
          onFocusOutside={(e) => {
            const target = e.target as Node | null;
            const editorDom = editor?.view.dom;
            if (target && editorDom && editorDom.contains(target)) {
              e.preventDefault();
            }
          }}
          onMouseDown={(e) => {
            // Keep editor focus when clicking buttons. Allow inputs to focus.
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
            <ToolbarButton
              title="Bold (⌘B)"
              isActive={editor?.isActive("bold") ?? false}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              B
            </ToolbarButton>
            <ToolbarButton
              title="Italic (⌘I)"
              isActive={editor?.isActive("italic") ?? false}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <i>I</i>
            </ToolbarButton>
            <ToolbarButton
              title="Link"
              isActive={editor?.isActive("link") ?? false}
              onClick={applyLink}
            >
              <span style={{ textDecoration: "underline" }}>a</span>
            </ToolbarButton>
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

type ToolbarButtonProps = {
  title: string;
  isActive: boolean;
  onClick: () => void;
  children: ReactNode;
};

function ToolbarButton({ title, isActive, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={isActive}
      className={isActive ? "is-active" : undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
