"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  Loading03Icon,
  PencilEdit02Icon,
  PlayIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AiEventStream } from "@/components/ai/ai-event-stream"
import { FilterBuilder } from "@/components/filter/filter-builder"
import { JobResultView } from "@/components/jobs/job-result-view"
import { MiniLeadPanel } from "@/components/leads/mini-lead-panel"
import { useAiTasks, upsertLocalMockTask } from "@/hooks/use-ai-tasks"
import { useFields } from "@/hooks/use-fields"
import { useLeads } from "@/hooks/use-leads"
import { api, ApiError } from "@/lib/api"
import { jobKindForTask } from "@/lib/job-kind"
import { evalFilters } from "@/lib/filter"
import { missingInputsForLead } from "@/lib/missing-inputs"
import { MOCK_LEADS } from "@/lib/mock-leads"
import { newRuleId, useRulesStore } from "@/lib/store/rules"
import { useEventStream } from "@/lib/sse"
import type {
  AiTask,
  AiTaskConfig,
  FilterClause,
  JobEvent,
  Rule,
  SlimLead,
} from "@/lib/types"
import { cn } from "@/lib/utils"

const USING_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1"

const MODEL_OPTIONS = [
  "claude-opus-4-7",
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
  "gemini-3-flash-preview",
  "gemma-4-26b-a4b-it",
] as const

const DEFAULT_CONTEXT_SUGGESTIONS = [
  "screenshot",
  "reviews",
  "crawl_pages",
  "hours",
  "categories",
  "rating",
] as const

type Props = {
  taskName: string | null
}

export function TaskEditor({ taskName }: Props): React.JSX.Element {
  const { tasks } = useAiTasks()
  const task = useMemo<AiTask | null>(
    () => tasks.find((t) => t.name === taskName) ?? null,
    [tasks, taskName],
  )

  if (taskName === null) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-[13px] text-muted-foreground">
        Select a task to edit, or create a new one.
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-[13px] text-muted-foreground">
        Loading task <span className="font-mono">{taskName}</span>…
      </div>
    )
  }

  // The actual editing surface lives in a child keyed on task.name so that
  // switching tasks reliably resets local form state.
  return <TaskEditorBody key={task.name} task={task} />
}

// -----------------------------------------------------------------------------
// Editor body — owns local form state per task.
// -----------------------------------------------------------------------------

function TaskEditorBody({ task }: { task: AiTask }): React.JSX.Element {
  const qc = useQueryClient()
  const isBrowserAgent = task.task_type === "browser_agent"
  const isVariant = task.task_type === "variant"

  // Mirror the source task into editable local state.
  const [label, setLabel] = useState<string>(task.label)
  const [enabled, setEnabled] = useState<boolean>(task.enabled)
  const [outputField, setOutputField] = useState<string>(
    (task.config.output_field as string | undefined) ?? task.name,
  )
  const [model, setModel] = useState<string>(task.config.model ?? "")
  const [included, setIncluded] = useState<string[]>(
    task.config.included_context ?? [],
  )
  const [prompt, setPrompt] = useState<string>(
    task.config.prompt_template ?? task.config.meta_prompt ?? "",
  )
  const [schemaText, setSchemaText] = useState<string>(
    task.config.response_json_schema
      ? JSON.stringify(task.config.response_json_schema, null, 2)
      : "",
  )
  const [startUrl, setStartUrl] = useState<string>(
    (task.config.start_url as string | undefined) ??
      (task.config.start_url_template as string | undefined) ??
      "",
  )
  const [maxPicks, setMaxPicks] = useState<number>(
    Number(task.config.max_picks ?? 5),
  )
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  // Has-changes detection.
  const isDirty = useMemo(() => {
    if (label !== task.label) return true
    if (enabled !== task.enabled) return true
    const cfg = task.config
    if (outputField !== ((cfg.output_field as string | undefined) ?? task.name))
      return true
    if (model !== (cfg.model ?? "")) return true
    if (
      JSON.stringify(included) !== JSON.stringify(cfg.included_context ?? [])
    )
      return true
    if (prompt !== (cfg.prompt_template ?? cfg.meta_prompt ?? "")) return true
    const curSchema = cfg.response_json_schema
      ? JSON.stringify(cfg.response_json_schema, null, 2)
      : ""
    if (schemaText.trim() !== curSchema.trim()) return true
    if (isBrowserAgent) {
      if (startUrl !== ((cfg.start_url_template as string | undefined) ?? ""))
        return true
      if (maxPicks !== Number(cfg.max_picks ?? 5)) return true
    }
    if (isVariant) {
      const cfgUrl =
        (cfg.start_url as string | undefined) ??
        (cfg.start_url_template as string | undefined) ??
        ""
      if (startUrl !== cfgUrl) return true
    }
    return false
  }, [
    label,
    enabled,
    outputField,
    model,
    included,
    prompt,
    schemaText,
    startUrl,
    maxPicks,
    isBrowserAgent,
    isVariant,
    task,
  ])

  // ----- save -----
  const saveMut = useMutation({
    mutationFn: async (patch: Partial<AiTask>) =>
      api.patchAiTask(task.name, patch),
    onSuccess: (updated) => {
      qc.setQueryData<AiTask[]>(["ai-tasks"], (prev) =>
        prev ? prev.map((t) => (t.name === updated.name ? updated : t)) : prev,
      )
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    },
  })

  function discard() {
    setLabel(task.label)
    setEnabled(task.enabled)
    setOutputField((task.config.output_field as string | undefined) ?? task.name)
    setModel(task.config.model ?? "")
    setIncluded(task.config.included_context ?? [])
    setPrompt(task.config.prompt_template ?? task.config.meta_prompt ?? "")
    setSchemaText(
      task.config.response_json_schema
        ? JSON.stringify(task.config.response_json_schema, null, 2)
        : "",
    )
    setStartUrl(
      (task.config.start_url as string | undefined) ??
        (task.config.start_url_template as string | undefined) ??
        "",
    )
    setMaxPicks(Number(task.config.max_picks ?? 5))
    setSchemaError(null)
  }

  async function save() {
    setSchemaError(null)
    let parsedSchema: unknown
    if (schemaText.trim()) {
      try {
        parsedSchema = JSON.parse(schemaText)
      } catch (err) {
        setSchemaError(
          err instanceof Error ? err.message : "Invalid JSON schema.",
        )
        return
      }
    }
    const nextConfig: AiTaskConfig = {
      ...task.config,
      model,
      prompt_template: prompt,
      included_context: included,
      output_field: outputField,
    }
    if (parsedSchema !== undefined) {
      nextConfig.response_json_schema = parsedSchema
    } else {
      delete nextConfig.response_json_schema
    }
    if (isBrowserAgent) {
      nextConfig.start_url_template = startUrl
      nextConfig.max_picks = maxPicks
      delete nextConfig.response_json_schema
      delete nextConfig.included_context
    } else if (isVariant) {
      const { response_json_schema: _s, included_context: _c, prompt_template: _p, model: _m, ...rest } =
        nextConfig
      Object.assign(nextConfig, {
        ...rest,
        start_url: startUrl,
        output_field: outputField,
        generation_timeout_s:
          (task.config.generation_timeout_s as number | undefined) ?? 900,
      })
    }
    const patch: Partial<AiTask> = {
      label,
      enabled,
      config: nextConfig,
    }
    try {
      await saveMut.mutateAsync(patch)
    } catch (err) {
      if (USING_MOCKS) {
        // Best-effort mock persistence so the dirty state clears.
        const merged: AiTask = {
          ...task,
          ...patch,
          updated_at: new Date().toISOString(),
        }
        upsertLocalMockTask(merged)
        qc.setQueryData<AiTask[]>(["ai-tasks"], (prev) =>
          prev ? prev.map((t) => (t.name === merged.name ? merged : t)) : prev,
        )
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 1500)
        return
      }
      // Re-surface error so the user sees it.
      throw err
    }
  }

  // ----- chip suggestions -----
  const chipKeys = useMemo<string[]>(() => {
    const set = new Set<string>([
      ...DEFAULT_CONTEXT_SUGGESTIONS,
      ...included,
    ])
    return Array.from(set)
  }, [included])

  function toggleChip(k: string) {
    setIncluded((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
    )
  }

  const [customChip, setCustomChip] = useState("")
  function addCustomChip() {
    const k = customChip.trim()
    if (!k) return
    if (!included.includes(k)) setIncluded([...included, k])
    setCustomChip("")
  }

  // ----- missing-input warnings (mirrors backend hard deps) -----
  const liveConfig = useMemo<AiTaskConfig>(
    () => ({
      ...task.config,
      included_context: included,
      prompt_template: prompt,
      meta_prompt: prompt,
    }),
    [task.config, included, prompt],
  )
  const getMissing = useMemo(
    () =>
      isBrowserAgent || isVariant
        ? undefined
        : (lead: SlimLead) => missingInputsForLead(lead, liveConfig),
    [isBrowserAgent, isVariant, liveConfig],
  )

  // ----- test-run on MiniLeadPanel selection -----
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [jobId, setJobId] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [events, setEvents] = useState<JobEvent[]>([])
  const [running, setRunning] = useState(false)

  // Mirror useLeads here so we can filter selectedIds → valid before submitting.
  const allLeadsQuery = useLeads()
  const leadsById = useMemo<Map<string, SlimLead>>(() => {
    const m = new Map<string, SlimLead>()
    for (const l of allLeadsQuery.data ?? []) m.set(l.place_id, l)
    if ((allLeadsQuery.isError || !allLeadsQuery.data) && USING_MOCKS) {
      for (const l of MOCK_LEADS) m.set(l.place_id, l)
    }
    return m
  }, [allLeadsQuery.data, allLeadsQuery.isError])

  const { validIds, skippedCount } = useMemo(() => {
    if (!getMissing) {
      return { validIds: Array.from(selectedIds), skippedCount: 0 }
    }
    const valid: string[] = []
    let skipped = 0
    for (const id of selectedIds) {
      const lead = leadsById.get(id)
      if (!lead) {
        valid.push(id)
        continue
      }
      if (getMissing(lead).length > 0) skipped += 1
      else valid.push(id)
    }
    return { validIds: valid, skippedCount: skipped }
  }, [selectedIds, leadsById, getMissing])

  useEventStream<JobEvent>(jobId !== null, {
    url: `/jobs/${jobId}/stream`,
    onEvent: (e) => setEvents((prev) => [...prev, e]),
  })

  async function runOnSelected() {
    if (validIds.length === 0) return
    setRunError(null)
    setEvents([])
    setJobId(null)
    setRunning(true)
    try {
      const overrides: Record<string, unknown> = {}
      const baseTpl =
        task.config.prompt_template ?? task.config.meta_prompt ?? ""
      if (prompt !== baseTpl) overrides.prompt = prompt
      if (model !== task.config.model) overrides.model = model
      if (
        JSON.stringify(included) !==
        JSON.stringify(task.config.included_context ?? [])
      ) {
        overrides.included_context = included
      }
      const jobKind = jobKindForTask(task)
      const baseArgs: Record<string, unknown> = {
        task: task.name,
        place_ids: validIds,
      }
      if (isVariant) {
        if (
          startUrl !==
          ((task.config.start_url as string | undefined) ??
            (task.config.start_url_template as string | undefined) ??
            "")
        ) {
          baseArgs.projects_url = startUrl
        }
      } else if (isBrowserAgent) {
        if (prompt !== (task.config.prompt_template ?? "")) {
          baseArgs.prompt_override = prompt
        }
        if (
          startUrl !==
          ((task.config.start_url_template as string | undefined) ?? "")
        ) {
          baseArgs.start_url_override = startUrl
        }
        if (model !== task.config.model) baseArgs.model = model
        if (maxPicks !== Number(task.config.max_picks ?? 5)) {
          baseArgs.max_picks = maxPicks
        }
      } else if (!isVariant && Object.keys(overrides).length) {
        baseArgs.overrides = overrides
      }
      const { id } = await api.startJob(jobKind, baseArgs)
      setJobId(id)
    } catch (err) {
      setRunError(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header strip */}
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border/60 bg-background/80 px-5 py-3 backdrop-blur-xl">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Task label"
          className="h-9 max-w-[320px] border-transparent bg-transparent px-2 text-[15px] font-semibold tracking-tight shadow-none hover:border-border/60 focus-visible:border-border focus-visible:bg-background"
        />
        <span className="rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
          {task.name}
        </span>
        <EnabledToggle
          enabled={enabled}
          onToggle={() => setEnabled((v) => !v)}
        />
        <span className="flex-1" />
        {savedFlash ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={12}
              strokeWidth={1.75}
            />
            Saved
          </span>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={discard}
          disabled={!isDirty || saveMut.isPending}
        >
          Discard
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void save()}
          disabled={!isDirty || saveMut.isPending}
        >
          {saveMut.isPending ? (
            <HugeiconsIcon
              icon={Loading03Icon}
              size={12}
              className="animate-spin"
            />
          ) : null}
          Save
        </Button>
      </header>

      {saveMut.isError && !USING_MOCKS ? (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-1.5 text-[12px] text-destructive">
          Save failed:{" "}
          {saveMut.error instanceof Error
            ? saveMut.error.message
            : String(saveMut.error)}
        </div>
      ) : null}

      {/* Tabs */}
      <Tabs defaultValue="definition" className="flex-1 px-4 py-3">
        <TabsList variant="line" className="self-start">
          <TabsTrigger value="definition">Definition</TabsTrigger>
          <TabsTrigger value="rules">Auto-rules</TabsTrigger>
        </TabsList>

        <TabsContent value="definition" className="mt-2">
          <div className="flex flex-col gap-4">
            {/* Top form */}
            <div
              className={cn(
                "grid grid-cols-1 gap-3",
                isVariant ? "md:grid-cols-1" : "md:grid-cols-2",
              )}
            >
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Output field
                </label>
                <Input
                  value={outputField}
                  onChange={(e) => setOutputField(e.target.value)}
                  placeholder={task.name}
                  className="h-8 text-[12px]"
                />
              </div>
              {!isVariant ? (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Model
                </label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger size="sm">
                    <SelectValue placeholder="Pick a model…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const opts = new Set<string>(MODEL_OPTIONS)
                      if (model) opts.add(model)
                      if (task.config.model) opts.add(task.config.model)
                      return Array.from(opts).map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))
                    })()}
                  </SelectContent>
                </Select>
              </div>
              ) : null}
            </div>

            {isVariant ? (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Variant projects URL
                </label>
                <Input
                  value={startUrl}
                  onChange={(e) => setStartUrl(e.target.value)}
                  placeholder="https://variant.com/projects"
                  className="h-8 font-mono text-[12px]"
                />
                <p className="text-muted-foreground text-[11px]">
                  Uses each lead&apos;s <code className="font-mono">design_prompt</code>{" "}
                  field. Run{" "}
                  <code className="font-mono">setup_variant_session</code> once to log in.
                </p>
              </div>
            ) : null}

            {/* Browser-agent extras */}
            {isBrowserAgent ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px]">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Start URL template
                  </label>
                  <Input
                    value={startUrl}
                    onChange={(e) => setStartUrl(e.target.value)}
                    placeholder="https://dribbble.com/search/{{query}}?s=popular"
                    className="h-8 font-mono text-[12px]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Max picks
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={maxPicks}
                    onChange={(e) =>
                      setMaxPicks(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="h-8 text-[12px]"
                  />
                </div>
              </div>
            ) : null}

            {/* Context chips — only meaningful for per-place LLM tasks */}
            {!isBrowserAgent && !isVariant ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Included context
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {chipKeys.map((k) => {
                  const active = included.includes(k)
                  return (
                    <Button
                      key={k}
                      type="button"
                      size="xs"
                      variant={active ? "secondary" : "outline"}
                      onClick={() => toggleChip(k)}
                    >
                      {k}
                    </Button>
                  )
                })}
                <div className="inline-flex items-center gap-1">
                  <Input
                    value={customChip}
                    onChange={(e) => setCustomChip(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addCustomChip()
                      }
                    }}
                    placeholder="add…"
                    className="h-6 w-24 px-2 text-[11px]"
                  />
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={addCustomChip}
                    disabled={customChip.trim() === ""}
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
            ) : null}

            {!isVariant ? (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {isBrowserAgent ? "Agent instructions" : "Prompt template"}
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[160px] font-mono text-[12.5px]"
                placeholder={
                  isBrowserAgent
                    ? "Tell the agent what to look for. Use {{design_prompt}}, {{label}}, {{category}}, {{query}} for per-place substitution."
                    : "Write your prompt. {{ context.* }} placeholders are interpolated server-side."
                }
              />
            </div>
            ) : null}

            {!isBrowserAgent && !isVariant ? (
            <details className="rounded-md border border-border bg-card">
              <summary className="cursor-pointer px-3 py-2 text-[12px] font-medium text-muted-foreground">
                Response JSON schema (optional)
              </summary>
              <div className="flex flex-col gap-1 px-3 pb-3">
                <Textarea
                  value={schemaText}
                  onChange={(e) => setSchemaText(e.target.value)}
                  placeholder='{"type":"object","properties":{...}}'
                  className="min-h-[100px] font-mono text-[12px]"
                />
                {schemaError ? (
                  <p className="text-[11px] text-destructive">{schemaError}</p>
                ) : null}
              </div>
            </details>
            ) : null}

            {/* MiniLeadPanel for test-run */}
            <div className="flex flex-col gap-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Test leads
              </div>
              <MiniLeadPanel
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                className="h-56"
                getMissing={getMissing}
              />
            </div>

            {/* Run on selected */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void runOnSelected()}
                  disabled={running || validIds.length === 0}
                >
                  {running ? (
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <HugeiconsIcon
                      icon={PlayIcon}
                      size={12}
                      strokeWidth={1.75}
                    />
                  )}
                  Run on selected ({validIds.length})
                </Button>
                {selectedIds.size === 0 ? (
                  <span className="text-[12px] text-muted-foreground">
                    Select leads below to test this task.
                  </span>
                ) : skippedCount > 0 ? (
                  <span className="text-[12px] text-amber-600 dark:text-amber-400">
                    {skippedCount} skipped — missing required inputs
                  </span>
                ) : null}
                {running && jobId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void api
                        .cancelJob(jobId)
                        .catch((err) =>
                          setRunError(
                            err instanceof ApiError
                              ? err.message
                              : (err as Error).message,
                          ),
                        )
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
              {runError ? (
                <p className="text-[12px] text-destructive">{runError}</p>
              ) : null}
              {events.length > 0 ? (
                <AiEventStream
                  events={events}
                  mode="stream"
                  autoScroll
                  levelFilter="info"
                  className="h-48 rounded-md border bg-card"
                />
              ) : null}
              {events.some(
                (e) =>
                  e.event === "finished" ||
                  e.event === "cancelled" ||
                  e.event === "error",
              ) &&
              events.some((e) => e.event === "item_done") ? (
                <div className="rounded-md border bg-card">
                  <JobResultView events={events} title="Result" />
                </div>
              ) : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="mt-2">
          <AutoRulesTab taskName={task.name} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Auto-rules tab
// -----------------------------------------------------------------------------

function AutoRulesTab({ taskName }: { taskName: string }): React.JSX.Element {
  const rules = useRulesStore((s) =>
    s.rules.filter((r) => r.task === taskName),
  )
  const upsert = useRulesStore((s) => s.upsert)
  const remove = useRulesStore((s) => s.remove)
  const toggle = useRulesStore((s) => s.toggle)

  const leadsQuery = useLeads()
  const { fields } = useFields()

  const usingMockFallback = USING_MOCKS && leadsQuery.isError
  const allLeads: SlimLead[] = useMemo(() => {
    if (leadsQuery.data) return leadsQuery.data
    if (usingMockFallback) return MOCK_LEADS
    return []
  }, [leadsQuery.data, usingMockFallback])

  const [editing, setEditing] = useState<Rule | null>(null)
  const [creating, setCreating] = useState(false)

  function matchCount(rule: Rule): number {
    return allLeads.filter((l) =>
      evalFilters(
        l as unknown as Record<string, unknown>,
        rule.filter,
        fields.length > 0 ? fields : undefined,
      ),
    ).length
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        Auto-rules persist locally for now. They&apos;ll fire automatically once
        the backend evaluator ships.
      </div>

      <div className="flex items-center justify-between">
        <div className="text-[13px] font-medium">
          Rules for{" "}
          <span className="font-mono text-[12px] text-muted-foreground">
            {taskName}
          </span>
        </div>
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => setCreating(true)}
        >
          <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.75} />
          New rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-4 text-center text-[12px] text-muted-foreground">
          No rules yet. Click <span className="font-medium">New rule</span> to
          define when this task should run automatically.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
            >
              <EnabledToggle
                enabled={rule.enabled}
                onToggle={() => toggle(rule.id)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-medium">
                    {rule.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    matches {matchCount(rule)} lead
                    {matchCount(rule) === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {rule.filter.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground">
                      (no filter — would match every lead)
                    </span>
                  ) : (
                    rule.filter.map((c, i) => (
                      <span
                        key={`${c.key}-${c.op}-${i}`}
                        className="inline-flex h-5 items-center gap-1 rounded-md border bg-background px-1.5 text-[11px] text-foreground"
                      >
                        <span className="font-medium">{c.key}</span>
                        <span className="text-muted-foreground">{c.op}</span>
                        {c.value !== undefined ? (
                          <span>
                            {Array.isArray(c.value)
                              ? c.value.join(", ")
                              : String(c.value)}
                          </span>
                        ) : null}
                      </span>
                    ))
                  )}
                </div>
                {rule.model_override ? (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Model override: {rule.model_override}
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label="Edit rule"
                onClick={() => setEditing(rule)}
              >
                <HugeiconsIcon
                  icon={PencilEdit02Icon}
                  size={12}
                  strokeWidth={1.75}
                />
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label="Delete rule"
                onClick={() => remove(rule.id)}
              >
                <HugeiconsIcon
                  icon={Delete02Icon}
                  size={12}
                  strokeWidth={1.75}
                />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Create dialog */}
      <RuleEditorDialog
        open={creating}
        onOpenChange={(o) => setCreating(o)}
        taskName={taskName}
        initial={null}
        onSave={(rule) => {
          upsert(rule)
          setCreating(false)
        }}
      />

      {/* Edit dialog */}
      <RuleEditorDialog
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) setEditing(null)
        }}
        taskName={taskName}
        initial={editing}
        onSave={(rule) => {
          upsert(rule)
          setEditing(null)
        }}
      />
    </div>
  )
}

// -----------------------------------------------------------------------------
// Rule editor (dialog)
// -----------------------------------------------------------------------------

function RuleEditorDialog({
  open,
  onOpenChange,
  taskName,
  initial,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  taskName: string
  initial: Rule | null
  onSave: (rule: Rule) => void
}): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit rule" : "New rule"}</DialogTitle>
        </DialogHeader>
        {open ? (
          <RuleEditorForm
            key={initial?.id ?? "new"}
            taskName={taskName}
            initial={initial}
            onCancel={() => onOpenChange(false)}
            onSave={onSave}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function RuleEditorForm({
  taskName,
  initial,
  onCancel,
  onSave,
}: {
  taskName: string
  initial: Rule | null
  onCancel: () => void
  onSave: (rule: Rule) => void
}): React.JSX.Element {
  const [name, setName] = useState<string>(initial?.name ?? "")
  const [clauses, setClauses] = useState<FilterClause[]>(initial?.filter ?? [])
  const [modelOverride, setModelOverride] = useState<string>(
    initial?.model_override ?? "",
  )

  // Form state is local-only; the parent re-mounts via key={initial?.id}
  // whenever it flips between create / edit.

  function commit() {
    const rule: Rule = {
      id: initial?.id ?? newRuleId(),
      name: name.trim() || "Untitled rule",
      enabled: initial?.enabled ?? true,
      task: taskName,
      filter: clauses,
      ...(modelOverride ? { model_override: modelOverride } : {}),
    }
    onSave(rule)
  }

  const modelOptions = useMemo(() => {
    const opts = new Set<string>(MODEL_OPTIONS)
    if (modelOverride) opts.add(modelOverride)
    return Array.from(opts)
  }, [modelOverride])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Name
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. high-rated no-website"
          className="h-8 text-[12px]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Filter
        </label>
        <FilterBuilder clauses={clauses} onChange={setClauses} compact />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Model override (optional)
        </label>
        <Select
          value={modelOverride || "_none"}
          onValueChange={(v) => setModelOverride(v === "_none" ? "" : v)}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Use task default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Use task default</SelectItem>
            {modelOptions.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-1.5 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={commit}>
          {initial ? "Save" : "Create"}
        </Button>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Small enabled toggle (shared with TaskList — duplicated to avoid an import
// cycle and keep both files self-contained).
// -----------------------------------------------------------------------------

function EnabledToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? "Disable" : "Enable"}
      className={cn(
        "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
        enabled ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-3 w-3 transform rounded-full bg-background shadow transition-transform",
          enabled ? "translate-x-3.5" : "translate-x-0.5",
        )}
      />
    </button>
  )
}
