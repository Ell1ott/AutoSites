"use client";

import { useId, useState, type ReactNode } from "react";

type ExpandableMenuBodyProps = {
  /** Plain text matching CMS body; used for “read more” length and preview. */
  measureText: string;
  children: ReactNode;
  previewLen?: number;
};

export function ExpandableMenuBody({
  measureText,
  children,
  previewLen = 150,
}: ExpandableMenuBodyProps) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const needsToggle = measureText.length > previewLen;
  const preview = `${measureText.slice(0, previewLen).trim()}…`;

  return (
    <>
      <p id={contentId}>
        {open || !needsToggle ? children : preview}
      </p>
      {needsToggle ? (
        <button
          type="button"
          className="read-more"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Læs mindre" : "Læs mere"}
        </button>
      ) : null}
    </>
  );
}
