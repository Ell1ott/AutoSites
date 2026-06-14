"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, PlayIcon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ContactsNodeSummary } from "@/components/flow-2/contacts-node-summary"
import { useFlow2Run } from "@/components/flow-2/use-flow-2-run"
import { useAiTasks } from "@/hooks/use-ai-tasks"
import { api } from "@/lib/api"
import type { Flow2LeadState, Flow2Node } from "@/lib/lead-flow-2"
import type { SlimLead } from "@/lib/types"

const STATE_LABEL: Record<Flow2LeadState, string> = {
  complete: "Done",
  ready: "Ready",
  blocked: "Blocked",
  errored: "Errored",
  ineligible: "Ineligible",
}

const STATE_LINK_ORDER: Flow2LeadState[] = [
  "complete",
  "blocked",
  "errored",
]

export function Flow2DetailPanel({
  node,
  leads = [],
  onClose,
}: {
  node: Flow2Node
  leads?: SlimLead[]
  onClose: () => void
}) {
  const { run, isRunning, runError, clearError } = useFlow2Run()
  const [force, setForce] = useState(false)
  const [includeErrored, setIncludeErrored] = useState(false)

  const targetIds = Array.from(
    new Set([
      ...(force ? node.rerunnableLeadIds : node.readyLeadIds),
      ...(includeErrored ? node.leadIdsByState.errored : []),
    ]),
  )
  const targetCount = targetIds.length
  const canRun = !!node.run && targetCount > 0
  const sampleIds = targetIds.slice(0, 8)

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-border bg-card">
      <header className="flex items-start justify-between gap-2 border-b border-border p-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">
            {node.label}
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {node.outputField ? (
              <span className="font-mono">{node.outputField}</span>
            ) : (
              node.kind
            )}
            {node.jobKind ? ` · ${node.jobKind}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.75} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Counts */}
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(STATE_LABEL) as Flow2LeadState[])
            .filter((s) => node.counts[s] > 0)
            .map((s) => {
              const href = node.links[s]
              const inner = (
                <div className="rounded-md border border-border bg-background px-2.5 py-2">
                  <div className="text-base font-semibold tabular-nums text-foreground">
                    {node.counts[s]}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {STATE_LABEL[s]}
                  </div>
                </div>
              )
              return href && STATE_LINK_ORDER.includes(s) ? (
                <Link key={s} href={href} className="transition-opacity hover:opacity-80">
                  {inner}
                </Link>
              ) : (
                <div key={s}>{inner}</div>
              )
            })}
        </div>

        {node.id === "gate:discard" ? <DiscardGateEditor /> : null}
        {node.id === "artifact:contacts" ? (
          <ContactsNodeSummary leads={leads} node={node} />
        ) : null}

        {/* Blockers */}
        {node.blockers.length > 0 ? (
          <section className="mt-5">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Top blockers
            </h3>
            <ul className="space-y-1.5">
              {node.blockers.slice(0, 6).map((b) => (
                <li
                  key={b.key}
                  className="flex items-center justify-between gap-2 text-[12px]"
                >
                  <span className="truncate text-foreground">{b.label}</span>
                  <span className="shrink-0 tabular-nums text-amber-600 dark:text-amber-400">
                    {b.count}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Sample leads */}
        {sampleIds.length > 0 ? (
          <section className="mt-5">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Sample {force || includeErrored ? "re-run" : "ready"} leads
            </h3>
            <ul className="space-y-1">
              {sampleIds.map((id) => (
                <li key={id}>
                  <Link
                    href={`/leads/${id}`}
                    className="block truncate font-mono text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {id}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {node.dependencies.length > 0 ? (
          <section className="mt-5">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Depends on
            </h3>
            <div className="flex flex-wrap gap-1">
              {node.dependencies.map((d) => (
                <span
                  key={d}
                  className="rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {d}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {/* Run footer */}
      {node.run ? (
        <footer className="border-t border-border p-4">
          {runError ? (
            <p className="mb-2 truncate text-[11px] text-red-500" title={runError}>
              {runError}
            </p>
          ) : null}
          {node.run.supportsForce && node.counts.complete > 0 ? (
            <label className="mb-2.5 flex cursor-pointer items-center gap-2 text-[12px] text-muted-foreground">
              <Checkbox
                checked={force}
                onCheckedChange={(v) => {
                  setForce(v === true)
                  clearError()
                }}
              />
              Re-run completed leads ({node.rerunnableLeadIds.length})
            </label>
          ) : null}
          {node.counts.errored > 0 ? (
            <label className="mb-2.5 flex cursor-pointer items-center gap-2 text-[12px] text-muted-foreground">
              <Checkbox
                checked={includeErrored}
                onCheckedChange={(v) => {
                  setIncludeErrored(v === true)
                  clearError()
                }}
              />
              Re-run errored leads ({node.counts.errored})
            </label>
          ) : null}
          <Button
            type="button"
            className="w-full"
            disabled={!canRun || isRunning}
            onClick={() => run({ node, force, includeErrored })}
          >
            <HugeiconsIcon icon={PlayIcon} size={13} strokeWidth={2} />
            {isRunning
              ? "Starting…"
              : canRun
                ? `Run on ${targetCount} ${targetCount === 1 ? "lead" : "leads"}`
                : "Nothing to run"}
          </Button>
        </footer>
      ) : null}
    </aside>
  )
}

/**
 * Threshold editor for the discard gate node. The max lives on the
 * `discard_score` task config (`discard_at`); a lead scoring at or above it is
 * discarded and does not continue into the creative tasks. Editing here patches
 * that task config and recomputes the flow.
 */
function DiscardGateEditor() {
  const qc = useQueryClient()
  const { tasks } = useAiTasks()
  const task = tasks.find((t) => t.name === "discard_score")
  const current = typeof task?.config.discard_at === "number" ? task.config.discard_at : null

  const [value, setValue] = useState(current === null ? "" : String(current))
  useEffect(() => {
    setValue(current === null ? "" : String(current))
  }, [current])

  const mutation = useMutation({
    mutationFn: async (next: number | null) => {
      if (!task) throw new Error("No discard_score task to configure.")
      return api.patchAiTask(task.name, {
        config: { ...task.config, discard_at: next ?? undefined },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-tasks"] })
      qc.invalidateQueries({ queryKey: ["flow-2", "leads"] })
    },
  })

  const trimmed = value.trim()
  const parsed = trimmed === "" ? null : Number(trimmed)
  const valid = parsed === null || (Number.isFinite(parsed) && parsed >= 1 && parsed <= 10)
  const dirty = (parsed ?? null) !== current

  return (
    <section className="mt-5">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Discard threshold
      </h3>
      {!task ? (
        <p className="text-[12px] text-muted-foreground">
          Add a <span className="font-mono">discard_score</span> task to enable the gate.
        </p>
      ) : (
        <>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Leads scoring at or above this value are discarded and won&apos;t continue.
            Leave blank to disable the gate.
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={10}
              step={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="off"
              className="h-8 w-20"
            />
            <Button
              type="button"
              size="sm"
              disabled={!valid || !dirty || mutation.isPending}
              onClick={() => mutation.mutate(parsed)}
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
          {!valid ? (
            <p className="mt-1.5 text-[11px] text-red-500">Enter a score between 1 and 10.</p>
          ) : null}
          {mutation.isError ? (
            <p className="mt-1.5 text-[11px] text-red-500">Failed to save threshold.</p>
          ) : null}
        </>
      )}
    </section>
  )
}
