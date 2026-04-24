import type { CSSProperties } from "react";
import Image from "next/image";
import { getCmsContent } from "../server/content";
import { getEditMode } from "../server/mode";
import { getSiteId } from "../server/site";
import type { CmsImage } from "../types";

type EditableImageProps = {
  cmsKey: string;
  fallback: CmsImage;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
};

export async function EditableImage({
  cmsKey,
  fallback,
  width,
  height,
  fill,
  sizes,
  priority,
  className,
  style,
}: EditableImageProps) {
  const siteId = await getSiteId();
  const row = await getCmsContent<"image">(siteId, cmsKey);
  const value: CmsImage = row?.kind === "image" ? row.value : fallback;
  const editMode = await getEditMode();

  const resolvedWidth = value.width ?? width;
  const resolvedHeight = value.height ?? height;

  if (!editMode) {
    if (fill) {
      return (
        <Image
          src={value.src}
          alt={value.alt}
          fill
          sizes={sizes}
          priority={priority}
          className={className}
          style={style}
        />
      );
    }
    return (
      <Image
        src={value.src}
        alt={value.alt}
        width={resolvedWidth ?? 1200}
        height={resolvedHeight ?? 800}
        sizes={sizes}
        priority={priority}
        className={className}
        style={style}
      />
    );
  }

  const { EditableImageClient } = await import(
    "../client/EditableImageClient"
  );
  return (
    <EditableImageClient
      cmsKey={cmsKey}
      initial={value}
      width={resolvedWidth}
      height={resolvedHeight}
      fill={fill}
      sizes={sizes}
      priority={priority}
      className={className}
      style={style}
    />
  );
}
