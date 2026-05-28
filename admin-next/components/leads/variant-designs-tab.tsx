"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowExpand02Icon,
  Loading03Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"

import {
  isVariantDesignResult,
  VariantDesignGrid,
} from "@/components/leads/variant-design-grid"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { api } from "@/lib/api"
import { jobKindForTask } from "@/lib/job-kind"
import { useEventStream } from "@/lib/sse"
import { useTrackJob } from "@/lib/store/job-toaster"
import type { AiTask, JobEvent, Lead, VariantDesignResult } from "@/lib/types"
import { cn } from "@/lib/utils"

export const VARIANT_DESIGN_TASK = "variant_design"
const OUTPUT_FIELD = "variant_design"
const DESIGN_BRIEF_TASK = "design_prompt"

type Props = {
  lead: Lead
  tasks: AiTask[]
}

function statusTone(
  status: VariantDesignResult["status"],
): "complete" | "running" | "warn" {
  if (status === "complete") return "complete"
  if (status === "running") return "running"
  return "warn"
}

export function VariantDesignsTab({ lead, tasks }: Props): React.JSX.Element {
  const variantTask = tasks.find((t) => t.name === VARIANT_DESIGN_TASK)
  const briefTask = tasks.find((t) => t.name === DESIGN_BRIEF_TASK)
  const outputField =
    (variantTask?.config.output_field as string | undefined) ?? OUTPUT_FIELD
  const raw = (lead.dynamic as Record<string, unknown> | undefined)?.[
    outputField
  ]
  const result: VariantDesignResult | null = isVariantDesignResult(raw)
    ? raw
    : null

  const designPrompt =
    typeof lead.dynamic?.design_prompt === "string"
      ? lead.dynamic.design_prompt
      : null

  const qc = useQueryClient()
  const trackJob = useTrackJob()
  const [pendingJobId, setPendingJobId] = useState<string | null>(null)

  const runMut = useMutation({
    mutationFn: async () => {
      if (!variantTask) throw new Error("variant_design task not configured")
      const kind = jobKindForTask(variantTask)
      return api.startJob(kind, {
        task: variantTask.name,
        place_ids: [lead.place_id],
      })
    },
    onSuccess: (res) => {
      setPendingJobId(res.id)
      trackJob(res.id, {
        title: `${variantTask?.label ?? VARIANT_DESIGN_TASK} · ${lead.name}`,
        kind: "variant_design",
      })
    },
  })

  useEventStream<JobEvent>(!!pendingJobId, {
    url: pendingJobId ? `/jobs/${encodeURIComponent(pendingJobId)}/stream` : "",
    storageKey: pendingJobId ? `variant-design:${pendingJobId}` : "",
    onEvent: (e) => {
      if (
        e.event === "finished" ||
        e.event === "cancelled" ||
        e.event === "error"
      ) {
        qc.invalidateQueries({ queryKey: ["lead", lead.place_id] })
        setPendingJobId(null)
      }
    },
  })

  const running = runMut.isPending || !!pendingJobId

  if (!variantTask) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/10 px-6 py-10 text-center">
        <p className="text-muted-foreground text-[13px]">
          No{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
            variant_design
          </code>{" "}
          task configured.
        </p>
      </div>
    )
  }

  const tone = result ? statusTone(result.status) : null

  return (
    <div className="flex flex-col gap-4">
      <motion.div
        className="flex flex-wrap items-center gap-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {briefTask ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex max-w-[min(100%,28rem)] items-center rounded-full px-2.5 py-1 text-[11px]",
                  designPrompt
                    ? "bg-muted/60 text-muted-foreground"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                <span className="text-foreground/70 mr-1.5 shrink-0 font-medium">
                  {briefTask.label}
                </span>
                <span className="truncate">
                  {designPrompt?.trim() || "Missing — run Design brief first"}
                </span>
              </span>
            </TooltipTrigger>
            {designPrompt ? (
              <TooltipContent side="bottom" className="max-w-sm text-[12px]">
                {designPrompt}
              </TooltipContent>
            ) : null}
          </Tooltip>
        ) : null}

        <span className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-1 text-[11px] text-muted-foreground">
          <span className="text-foreground/70 mr-1.5 font-medium">
            {variantTask.label}
          </span>
          {result ? (
            <span
              className={cn(
                "font-medium",
                tone === "complete" && "text-emerald-600 dark:text-emerald-400",
                tone === "running" && "text-muted-foreground",
                tone === "warn" && "text-amber-700 dark:text-amber-400",
              )}
            >
              {result.status === "complete"
                ? `${result.designs.length} ready`
                : result.status === "running"
                  ? "Generating…"
                  : result.status === "timed_out"
                    ? "Timed out"
                    : "Failed"}
            </span>
          ) : (
            <span>Not generated</span>
          )}
        </span>

        {result?.url ? (
          <Button
            type="button"
            size="xs"
            variant="outline"
            className="rounded-full"
            asChild
          >
            <a href={result.url} target="_blank" rel="noopener noreferrer">
              Open chat
              <HugeiconsIcon
                icon={ArrowExpand02Icon}
                size={12}
                strokeWidth={1.75}
                data-icon="inline-end"
              />
            </a>
          </Button>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={running || !designPrompt?.trim()}
            onClick={() => runMut.mutate()}
          >
            {running ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size={14}
                  className="animate-spin"
                  data-icon="inline-start"
                />
                {runMut.isPending ? "Starting…" : "Generating…"}
              </>
            ) : (
              <>
                <HugeiconsIcon
                  icon={SparklesIcon}
                  size={14}
                  strokeWidth={1.75}
                  data-icon="inline-start"
                />
                Generate on Variant
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {runMut.isError ? (
        <p className="text-destructive text-[12px]">
          {runMut.error instanceof Error
            ? runMut.error.message
            : "Failed to start job."}
        </p>
      ) : null}

      {result ? (
        <VariantDesignGrid
          result={result}
          expanded
          hideMeta
          placeId={lead.place_id}
          outputField={outputField}
        />
      ) : (
        <motion.div
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/5 px-6 py-16 text-center"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-muted/60"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <HugeiconsIcon
              icon={SparklesIcon}
              size={18}
              strokeWidth={1.75}
              className="text-muted-foreground"
            />
          </motion.div>
          <p className="text-[15px] font-medium">No designs yet</p>
          <p className="text-muted-foreground mt-1 max-w-sm text-[13px]">
            {designPrompt
              ? "Generate on Variant to turn the brief into full-page previews."
              : "Add a design brief first, then generate on Variant."}
          </p>
        </motion.div>
      )}
    </div>
  )
}
