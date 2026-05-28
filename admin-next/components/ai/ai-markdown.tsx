"use client"

import * as React from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Components } from "react-markdown"

import { cn } from "@/lib/utils"

const markdownComponents: Components = {
  a({ href, children, className, ...props }) {
    return (
      <a
        {...props}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "text-primary break-words underline-offset-2 hover:underline",
          className,
        )}
      >
        {children}
      </a>
    )
  },
  blockquote({ className, ...props }) {
    return (
      <blockquote
        {...props}
        className={cn(
          "border-border text-muted-foreground my-3 border-l-[3px] pl-3 text-[12.5px] leading-relaxed italic",
          className,
        )}
      />
    )
  },
  code({ className: codeClassName, children, ...props }) {
    const isFenced = Boolean(codeClassName?.match(/\blanguage-/))
    return (
      <code
        {...props}
        className={cn(
          !isFenced &&
            "bg-muted rounded px-1 py-px font-mono text-[11.5px] [pre_&]:bg-transparent [pre_&]:p-0",
          codeClassName,
        )}
      >
        {children}
      </code>
    )
  },
  del({ className, ...props }) {
    return (
      <del
        {...props}
        className={cn(
          "text-muted-foreground",
          className,
        )}
      />
    )
  },
  hr({ className, ...props }) {
    return (
      <hr {...props} className={cn("border-border my-4", className)} />
    )
  },
  h1({ className, ...props }) {
    return (
      <h1
        {...props}
        className={cn(
          "mb-2 mt-3 text-[15px] font-semibold leading-snug tracking-tight first:mt-0",
          className,
        )}
      />
    )
  },
  h2({ className, ...props }) {
    return (
      <h2
        {...props}
        className={cn(
          "mb-2 mt-3 text-[14px] font-semibold leading-snug tracking-tight first:mt-0",
          className,
        )}
      />
    )
  },
  h3({ className, ...props }) {
    return (
      <h3
        {...props}
        className={cn(
          "mb-2 mt-2 text-[13px] font-semibold leading-snug first:mt-0",
          className,
        )}
      />
    )
  },
  li({ className, ...props }) {
    return (
      <li
        {...props}
        className={cn(
          "my-1 text-[13px] leading-relaxed marker:text-muted-foreground",
          "[&.task-list-item]:flex [&.task-list-item]:items-start [&.task-list-item]:gap-2",
          className,
        )}
      />
    )
  },
  ol({ className, ...props }) {
    return (
      <ol
        {...props}
        className={cn("my-2 list-decimal space-y-0.5 pl-5 marker:text-muted-foreground", className)}
      />
    )
  },
  p({ className, ...props }) {
    return (
      <p
        {...props}
        className={cn(
          "my-2 text-[13px] leading-relaxed first:mt-0 last:mb-0",
          className,
        )}
      />
    )
  },
  pre({ className, ...props }) {
    return (
      <pre
        {...props}
        className={cn(
          "border-border/60 bg-muted/40 my-3 max-h-72 overflow-x-auto rounded-md border p-3 font-mono text-[11.5px] leading-relaxed",
          className,
        )}
      />
    )
  },
  ul({ className, ...props }) {
    return (
      <ul
        {...props}
        className={cn(
          "my-2 max-w-none list-disc space-y-0.5 pl-5 marker:text-muted-foreground",
          "[&.contains-task-list]:list-none [&.contains-task-list]:space-y-1 [&.contains-task-list]:pl-1",
          className,
        )}
      />
    )
  },
  table({ children, className: tableCn, ...props }) {
    return (
      <div className="border-border my-3 overflow-x-auto rounded-md border">
        <table
          {...props}
          className={cn(
            "w-full border-collapse overflow-hidden text-left text-[12px]",
            tableCn,
          )}
        >
          {children}
        </table>
      </div>
    )
  },
  thead({ className, ...props }) {
    return (
      <thead
        {...props}
        className={cn(
          "bg-muted/35 border-border text-[11.5px] uppercase tracking-wide",
          className,
        )}
      />
    )
  },
  th({ className, ...props }) {
    return (
      <th
        {...props}
        className={cn(
          "border-border max-w-[12rem] border px-2 py-1.5 font-medium",
          className,
        )}
      />
    )
  },
  td({ className, ...props }) {
    return (
      <td
        {...props}
        className={cn("border-border border px-2 py-1.5 align-top", className)}
      />
    )
  },
  img({ alt, className, ...props }) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- markdown URIs come from trusted task output context
      <img
        {...props}
        alt={alt ?? ""}
        className={cn(
          "border-border my-3 h-auto max-h-80 max-w-full rounded-md border object-contain",
          className,
        )}
      />
    )
  },
  strong({ className, ...props }) {
    return (
      <strong {...props} className={cn("font-semibold", className)} />
    )
  },
  input({ readOnly: readOnlyProp, type, className, ...props }) {
    if (type === "checkbox") {
      return (
        <input
          {...props}
          type="checkbox"
          readOnly={readOnlyProp ?? true}
          className={cn(
            "border-border mr-2 inline-block size-[0.875rem] shrink-0 cursor-default rounded-sm border accent-primary align-top",
            className,
          )}
        />
      )
    }
    return (
      <input
        {...props}
        readOnly={readOnlyProp}
        type={type}
        className={className}
      />
    )
  },
}

type AiMarkdownProps = {
  /** Markdown body (GFM). */
  children: string
  className?: string
}

/** Renders task / AI markdown output with typography aligned to nearby cards. */
export function AiMarkdown({ children: md, className }: AiMarkdownProps): React.JSX.Element {
  const raw = md ?? ""

  return (
    <div
      className={cn(
        "min-w-0 text-[13px] text-foreground",
        "[&_*:first-child]:mt-0",
        "[&_*:last-child]:mb-0",
        className,
      )}
    >
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents} skipHtml>
        {raw}
      </Markdown>
    </div>
  )
}
