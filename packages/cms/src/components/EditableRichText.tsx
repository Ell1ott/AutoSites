import type { CSSProperties, ElementType } from "react";
import { getCmsContent } from "../server/content";
import { getEditMode } from "../server/mode";
import { getSiteId } from "../server/site";
import type { CmsTextStyle } from "../types";

type EditableRichTextProps = {
  cmsKey: string;
  fallback: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
};

function styleFromCms(s: CmsTextStyle | undefined): CSSProperties {
  if (!s) return {};
  const out: CSSProperties = {};
  if (typeof s.fontSize === "number") out.fontSize = `${s.fontSize}rem`;
  if (typeof s.lineHeight === "number") out.lineHeight = s.lineHeight;
  return out;
}

export async function EditableRichText({
  cmsKey,
  fallback,
  as: Tag = "div",
  className,
  style,
}: EditableRichTextProps) {
  const siteId = await getSiteId();
  const row = await getCmsContent<"richText">(siteId, cmsKey);
  const html = row?.kind === "richText" ? row.value.html : fallback;
  const cmsStyle =
    row?.kind === "richText" ? styleFromCms(row.value.style) : {};
  const mergedStyle: CSSProperties = { ...style, ...cmsStyle };
  const editMode = await getEditMode();

  if (!editMode) {
    return (
      <Tag
        className={className}
        style={mergedStyle}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const { EditableRichTextClient } = await import(
    "../client/EditableRichTextClient"
  );
  return (
    <EditableRichTextClient
      cmsKey={cmsKey}
      initialHtml={html}
      initialStyle={row?.kind === "richText" ? row.value.style : undefined}
      tag={Tag as string}
      className={className}
      style={style}
    />
  );
}
