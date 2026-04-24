import type { CSSProperties, ReactNode } from "react";
import { getCmsContent } from "../server/content";
import { getEditMode } from "../server/mode";
import { getSiteId } from "../server/site";
import type { CmsLink } from "../types";

type EditableLinkProps = {
  cmsKey: string;
  fallback: CmsLink;
  as?: "a" | "button";
  className?: string;
  style?: CSSProperties;
  children?: (label: string) => ReactNode;
  target?: string;
  rel?: string;
};

export async function EditableLink({
  cmsKey,
  fallback,
  as = "a",
  className,
  style,
  children,
  target,
  rel,
}: EditableLinkProps) {
  const siteId = await getSiteId();
  const row = await getCmsContent<"link">(siteId, cmsKey);
  const value: CmsLink = row?.kind === "link" ? row.value : fallback;
  const editMode = await getEditMode();

  if (!editMode) {
    const body = children ? children(value.label) : value.label;
    if (as === "button") {
      return (
        <button type="button" className={className} style={style}>
          {body}
        </button>
      );
    }
    return (
      <a
        href={value.href}
        target={target}
        rel={rel}
        className={className}
        style={style}
      >
        {body}
      </a>
    );
  }

  const { EditableLinkClient } = await import(
    "../client/EditableLinkClient"
  );
  return (
    <EditableLinkClient
      cmsKey={cmsKey}
      initial={value}
      as={as}
      className={className}
      style={style}
      target={target}
      rel={rel}
      /* Child render functions aren't serializable across the server/client
         boundary, so the client editor renders the bare label in edit mode. */
    />
  );
}
