import type { CSSProperties, ElementType, ReactNode } from "react";
import { getCmsContent } from "../server/content";
import { getEditMode } from "../server/mode";
import { getSiteId } from "../server/site";
import type { CmsTextStyle } from "../types";

type EditableTextProps = {
  cmsKey: string;
  fallback: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  before?: ReactNode;
  after?: ReactNode;
};

function styleFromCms(s: CmsTextStyle | undefined): CSSProperties {
  if (!s) return {};
  const out: CSSProperties = {};
  if (typeof s.fontSize === "number") out.fontSize = `${s.fontSize}rem`;
  if (typeof s.lineHeight === "number") out.lineHeight = s.lineHeight;
  return out;
}

export async function EditableText({
  cmsKey,
  fallback,
  as: Tag = "span",
  className,
  style,
  before,
  after,
}: EditableTextProps) {
  const siteId = await getSiteId();
  const row = await getCmsContent<"text">(siteId, cmsKey);
  const text = row?.kind === "text" ? row.value.text : fallback;
  const cmsStyle =
    row?.kind === "text" ? styleFromCms(row.value.style) : {};
  const mergedStyle: CSSProperties = { ...style, ...cmsStyle };
  const editMode = await getEditMode();

  if (!editMode) {
    // If text contains HTML formatting tags, render as HTML
    const hasHtml = /<(?:b|strong|i|em|br)\b/i.test(text);
    if (hasHtml) {
      return (
        <Tag className={className} style={mergedStyle}>
          {before}
          <span dangerouslySetInnerHTML={{ __html: text }} />
          {after}
        </Tag>
      );
    }
    return (
      <Tag className={className} style={mergedStyle}>
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
      initialStyle={row?.kind === "text" ? row.value.style : undefined}
      tag={Tag as string}
      className={className}
      style={style}
      before={before}
      after={after}
    />
  );
}
