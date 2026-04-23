"use client";

import Image from "next/image";
import { useRef, useState, type CSSProperties } from "react";
import { updateContent, uploadImage } from "../server/actions";
import { useCmsFieldRegistration, useEditableContext } from "./EditableProvider";
import { useToastStore } from "./Toast";
import type { CmsImage } from "../types";
import { useTrack } from "@autosites/analytics/client";
import { EVENTS } from "@autosites/analytics/events";

type EditableImageClientProps = {
  cmsKey: string;
  initial: CmsImage;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function EditableImageClient({
  cmsKey,
  initial,
  width,
  height,
  fill,
  sizes,
  priority,
  className,
  style,
}: EditableImageClientProps) {
  const [value, setValue] = useState<CmsImage>(initial);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { pushToast } = useEditableContext();
  const track = useTrack();
  useCmsFieldRegistration(cmsKey, "image", value);

  async function handleFile(file: File) {
    setUploading(true);
    const toast = pushToast({ kind: "info", message: "Uploading…" });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { src } = await uploadImage(fd);
      const dims = await readImageDims(file);
      const next: CmsImage = {
        src,
        alt: value.alt,
        width: dims?.width ?? value.width,
        height: dims?.height ?? value.height,
      };
      await updateContent(cmsKey, "image", next);
      setValue(next);
      useToastStore.dismiss(toast.id);
      pushToast({ kind: "success", message: "Image updated" });
    } catch (err) {
      useToastStore.dismiss(toast.id);
      pushToast({
        kind: "error",
        message: err instanceof Error ? err.message : "Upload failed.",
      });
    } finally {
      setUploading(false);
    }
  }

  async function editAlt() {
    const next = window.prompt("Alt text", value.alt) ?? value.alt;
    if (next === value.alt) return;
    const toast = pushToast({ kind: "info", message: "Saving…" });
    try {
      const updated = { ...value, alt: next };
      await updateContent(cmsKey, "image", updated);
      setValue(updated);
      useToastStore.dismiss(toast.id);
      pushToast({ kind: "success", message: "Saved" });
    } catch (err) {
      useToastStore.dismiss(toast.id);
      pushToast({
        kind: "error",
        message: err instanceof Error ? err.message : "Save failed.",
      });
    }
  }

  const cls = [className, "cms-editable", "cms-editable--image"]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={cls}
      style={{
        display: fill ? "contents" : "inline-block",
        ...(fill ? undefined : style),
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        editAlt();
      }}
      data-cms-key={cmsKey}
    >
      {fill ? (
        <Image
          src={value.src}
          alt={value.alt}
          fill
          sizes={sizes}
          priority={priority}
          className={className}
          style={style}
        />
      ) : (
        <Image
          src={value.src}
          alt={value.alt}
          width={value.width ?? width ?? 1200}
          height={value.height ?? height ?? 800}
          sizes={sizes}
          priority={priority}
          className={className}
          style={style}
        />
      )}
      <button
        type="button"
        className="cms-image-replace"
        onClick={() => {
          track(EVENTS.CMS_IMAGE_PICKER_OPENED, { key: cmsKey });
          inputRef.current?.click();
        }}
        disabled={uploading}
        aria-label="Replace image"
      >
        {uploading ? "Uploading…" : "Replace"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.currentTarget.value = "";
        }}
      />
    </span>
  );
}

function readImageDims(
  file: File,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
