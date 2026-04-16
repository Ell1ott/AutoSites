import type { CSSProperties, ElementType, ReactNode } from "react";
import { getCmsContent } from "../server/content";
import { getEditMode } from "../server/mode";

type EditableTextProps = {
  cmsKey: string;
  fallback: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /** Optional rendered prefix/suffix kept outside the editable surface. */
  before?: ReactNode;
  after?: ReactNode;
};

export async function EditableText({
  cmsKey,
  fallback,
  as: Tag = "span",
  className,
  style,
  before,
  after,
}: EditableTextProps) {
  const row = await getCmsContent<"text">(cmsKey);
  const text = row?.kind === "text" ? row.value.text : fallback;
  const editMode = await getEditMode();

  if (!editMode) {
    return (
      <Tag className={className} style={style}>
        {before}
        {text}
        {after}
      </Tag>
    );
  }

  const { EditableTextClient } = await import(
    "../client/EditableTextClient"
  );
  return (
    <EditableTextClient
      cmsKey={cmsKey}
      initialText={text}
      tag={Tag as string}
      className={className}
      style={style}
      before={before}
      after={after}
    />
  );
}
