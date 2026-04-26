"use client";

import { useId, useState, type ReactNode } from "react";

type ExpandableMenuItemProps = {
  title: ReactNode;
  children: string;
  previewLen?: number;
};

export function ExpandableMenuItem({
  title,
  children,
  previewLen = 150,
}: ExpandableMenuItemProps) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const needsToggle = children.length > previewLen;
  const preview = `${children.slice(0, previewLen).trim()}…`;

  return (
    <div className="menu-item">
      <h3>{title}</h3>
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
          {open ? "read less" : "read more"}
        </button>
      ) : null}
    </div>
  );
}
