"use client"

import { useMemo } from "react"
import {
  createColumnHelper,
  type ColumnDef,
} from "@tanstack/react-table"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  flow2StepColumnId,
  getFlow2PipelineSteps,
  isFlow2StepComplete,
  type Flow2PipelineStep,
  type Flow2StepCompleteContext,
} from "@/lib/lead-flow-2"
import type { AiTask, SlimLead } from "@/lib/types"
import { cn } from "@/lib/utils"

export const FLOW2_COL_WIDTH = 30

const columnHelper = createColumnHelper<SlimLead>()

export function Flow2StatusCell({
  lead,
  step,
  ctx,
}: {
  lead: SlimLead
  step: Flow2PipelineStep
  ctx: Flow2StepCompleteContext
}) {
  const done = isFlow2StepComplete(lead, step.id, ctx)
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex w-full items-center justify-center">
            <span
              className={cn(
                "size-2.5 shrink-0 rounded-full",
                done ? "bg-emerald-500" : "bg-red-500",
              )}
              aria-label={`${step.fullLabel}: ${done ? "done" : "missing"}`}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[12px]">
          {step.fullLabel}: {done ? "done" : "missing"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function buildFlow2ColumnDefs(
  steps: Flow2PipelineStep[],
  ctx: Flow2StepCompleteContext,
): ColumnDef<SlimLead>[] {
  return steps.map((step) =>
    columnHelper.display({
      id: flow2StepColumnId(step.id),
      size: FLOW2_COL_WIDTH,
      minSize: FLOW2_COL_WIDTH,
      maxSize: FLOW2_COL_WIDTH,
      enableResizing: false,
      meta: { flow2Step: step },
      header: () => (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block w-full truncate text-center text-[10px] font-medium uppercase tracking-tight text-muted-foreground">
                {step.shortLabel}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[12px]">
              {step.fullLabel}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      cell: ({ row }) => (
        <Flow2StatusCell lead={row.original} step={step} ctx={ctx} />
      ),
    }),
  )
}

export function useFlow2TableContext(tasks: AiTask[]) {
  const steps = useMemo(() => getFlow2PipelineSteps(tasks), [tasks])
  const ctx = useMemo(
    (): Flow2StepCompleteContext => ({ tasks, steps }),
    [tasks, steps],
  )
  return { steps, ctx }
}
