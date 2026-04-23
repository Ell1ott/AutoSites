<script lang="ts">
	import { untrack } from 'svelte';
	import type { PageData } from './$types';
	import type { AiTaskSettings, RunSummary, Settings } from '$lib/ai.types';
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import {
		ToggleGroup,
		ToggleGroupItem
	} from '$lib/components/ui/toggle-group/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		Tooltip,
		TooltipContent,
		TooltipProvider,
		TooltipTrigger
	} from '$lib/components/ui/tooltip/index.js';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';

	let { data }: { data: PageData } = $props();

	function cloneTasks(tasks: Record<string, AiTaskSettings>): Record<string, AiTaskSettings> {
		const o: Record<string, AiTaskSettings> = {};
		for (const k of Object.keys(tasks)) {
			o[k] = { ...tasks[k] };
		}
		return o;
	}

	function taskOrderFromSettings(s: Settings): string[] {
		return s.ai_task_order.filter((id) => id in s.ai_tasks);
	}

	type Mode = 'all-new' | 'pick' | 'limit';
	type ItemStatus = 'pending' | 'generating' | 'done' | 'failed' | 'skipped';
	interface LiveItem {
		name: string;
		status: ItemStatus;
		before?: string | null;
		after?: string;
		error?: string;
		reason?: string;
	}

	const initialOrder = untrack(() => taskOrderFromSettings(data.settings));
	const initialTaskId = initialOrder[0] ?? 'design_prompt';

	let taskOrder = $state<string[]>(untrack(() => [...initialOrder]));
	let selectedTaskId = $state(initialTaskId);
	let lastTaskId = $state(initialTaskId);
	let drafts = $state<Record<string, AiTaskSettings>>(
		untrack(() => cloneTasks(data.settings.ai_tasks))
	);
	let baselines = $state<Record<string, AiTaskSettings>>(
		untrack(() => cloneTasks(data.settings.ai_tasks))
	);

	let settings = $state<AiTaskSettings>(
		untrack(() => ({ ...drafts[initialTaskId] }))
	);
	let baseline = $state<AiTaskSettings>(
		untrack(() => ({ ...baselines[initialTaskId] }))
	);

	let runsList = $state<RunSummary[]>(untrack(() => [...data.runs]));
	let savingSettings = $state(false);
	let settingsSaved = $state<string | null>(null);
	let settingsError = $state<string | null>(null);

	const OUTPUT_FIELD_RE = /^[a-z][a-z0-9_]*$/i;

	$effect(() => {
		const id = selectedTaskId;
		if (id !== lastTaskId) {
			drafts = { ...drafts, [lastTaskId]: { ...settings } };
			settings = { ...drafts[id] };
			baseline = { ...baselines[id] };
			lastTaskId = id;
			settingsSaved = null;
			settingsError = null;
		}
	});

	const settingsDirty = $derived(
		settings.meta_prompt !== baseline.meta_prompt ||
			settings.model !== baseline.model ||
			settings.send_screenshot !== baseline.send_screenshot ||
			settings.send_markdown !== baseline.send_markdown ||
			settings.subpage_markdown_mode !== baseline.subpage_markdown_mode ||
			settings.recommended_subpages_field !== baseline.recommended_subpages_field ||
			settings.label !== baseline.label ||
			settings.output_field !== baseline.output_field
	);
	const settingsInvalid = $derived(
		!settings.label.trim() ||
			!settings.output_field.trim() ||
			!OUTPUT_FIELD_RE.test(settings.output_field.trim()) ||
			!settings.meta_prompt.trim() ||
			!settings.model.trim() ||
			(!settings.send_screenshot && !settings.send_markdown) ||
			(settings.subpage_markdown_mode === 'recommended' &&
				!settings.recommended_subpages_field.trim())
	);

	const currentOutputField = $derived(settings.output_field.trim() || selectedTaskId);

	let addTaskOpen = $state(false);
	let addTaskSaving = $state(false);
	let addTaskError = $state<string | null>(null);
	let newTaskIdInput = $state('');
	let newTaskLabelInput = $state('');
	let newTaskOutputFieldInput = $state('');
	let addTaskCopyFromId = $state('');

	function humanizeSlug(id: string): string {
		return id
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (c) => c.toUpperCase())
			.trim() || id;
	}

	function openAddTaskDialog() {
		addTaskError = null;
		newTaskIdInput = '';
		newTaskLabelInput = '';
		newTaskOutputFieldInput = '';
		addTaskCopyFromId =
			selectedTaskId in drafts ? selectedTaskId : (taskOrder[0] ?? '');
		addTaskOpen = true;
	}

	async function submitAddTask() {
		addTaskError = null;
		const id = newTaskIdInput.trim();
		if (!OUTPUT_FIELD_RE.test(id)) {
			addTaskError =
				'Task id must start with a letter and use only letters, digits, and underscores';
			return;
		}
		if (id in drafts) {
			addTaskError = 'A task with this id already exists';
			return;
		}
		const outField = newTaskOutputFieldInput.trim() || id;
		if (!OUTPUT_FIELD_RE.test(outField)) {
			addTaskError = 'Output field has invalid characters';
			return;
		}
		for (const [tid, t] of Object.entries(drafts)) {
			if (t.output_field === outField) {
				addTaskError = `Output field "${outField}" is already used by task "${tid}"`;
				return;
			}
		}
		const src =
			(addTaskCopyFromId && drafts[addTaskCopyFromId]) ||
			drafts[taskOrder[0] ?? ''] ||
			Object.values(drafts)[0];
		if (!src) {
			addTaskError = 'No existing task to copy settings from';
			return;
		}

		const label = newTaskLabelInput.trim() || humanizeSlug(id);
		const newSettings: AiTaskSettings = {
			label,
			output_field: outField,
			meta_prompt: src.meta_prompt,
			model: src.model,
			send_screenshot: src.send_screenshot,
			send_markdown: src.send_markdown,
			subpage_markdown_mode: src.subpage_markdown_mode,
			recommended_subpages_field: src.recommended_subpages_field
		};

		drafts = { ...drafts, [selectedTaskId]: { ...settings } };
		addTaskSaving = true;
		try {
			const res = await fetch('/api/ai/design-prompts/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					taskId: id,
					label: newSettings.label,
					output_field: newSettings.output_field,
					meta_prompt: newSettings.meta_prompt,
					model: newSettings.model,
					send_screenshot: newSettings.send_screenshot,
					send_markdown: newSettings.send_markdown,
					subpage_markdown_mode: newSettings.subpage_markdown_mode,
					recommended_subpages_field: newSettings.recommended_subpages_field
				})
			});
			if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
			const body = (await res.json()) as Settings;
			taskOrder = taskOrderFromSettings(body);
			baselines = cloneTasks(body.ai_tasks);
			drafts = cloneTasks(body.ai_tasks);
			lastTaskId = id;
			selectedTaskId = id;
			settings = { ...drafts[id] };
			baseline = { ...baselines[id] };
			settingsSaved = new Date().toLocaleTimeString();
			settingsError = null;
			addTaskOpen = false;
			await invalidateAll();
		} catch (err) {
			addTaskError = err instanceof Error ? err.message : String(err);
		} finally {
			addTaskSaving = false;
		}
	}

	async function saveSettings() {
		drafts = { ...drafts, [selectedTaskId]: { ...settings } };
		savingSettings = true;
		settingsError = null;
		settingsSaved = null;
		try {
			const res = await fetch('/api/ai/design-prompts/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					taskId: selectedTaskId,
					label: settings.label,
					output_field: settings.output_field,
					meta_prompt: settings.meta_prompt,
					model: settings.model,
					send_screenshot: settings.send_screenshot,
					send_markdown: settings.send_markdown,
					subpage_markdown_mode: settings.subpage_markdown_mode,
					recommended_subpages_field: settings.recommended_subpages_field
				})
			});
			if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
			const body = (await res.json()) as Settings;
			taskOrder = taskOrderFromSettings(body);
			baselines = cloneTasks(body.ai_tasks);
			drafts = cloneTasks(body.ai_tasks);
			if (!(selectedTaskId in drafts) && taskOrder[0]) {
				selectedTaskId = taskOrder[0];
				lastTaskId = taskOrder[0];
			}
			settings = { ...drafts[selectedTaskId] };
			baseline = { ...baselines[selectedTaskId] };
			settingsSaved = new Date().toLocaleTimeString();
		} catch (err) {
			settingsError = err instanceof Error ? err.message : String(err);
		} finally {
			savingSettings = false;
		}
	}

	function resetSettings() {
		settings = { ...baseline };
		drafts = { ...drafts, [selectedTaskId]: { ...settings } };
		settingsError = null;
		settingsSaved = null;
	}

	let mode = $state<Mode>('all-new');
	let pickSearch = $state('');
	let pickedIds = $state<string[]>([]);
	let limitValue = $state(5);
	/** Parallel Gemini calls (passed to generate_design_prompts.py --workers). */
	let runConcurrency = $state(4);

	const pickedSet = $derived(new Set(pickedIds));
	const filteredPlaces = $derived.by(() => {
		const q = pickSearch.trim().toLowerCase();
		return data.places
			.filter((p) => p.has_screenshot)
			.filter(
				(p) =>
					!q ||
					p.name.toLowerCase().includes(q) ||
					(p.subtitle?.toLowerCase().includes(q) ?? false) ||
					p.id.toLowerCase().includes(q)
			);
	});
	const eligibleTotal = $derived(data.places.filter((p) => p.has_screenshot).length);
	const newEligibleCount = $derived(
		data.places.filter((p) => p.has_screenshot && !p.has_task_output[selectedTaskId]).length
	);

	function togglePick(id: string) {
		pickedIds = pickedIds.includes(id)
			? pickedIds.filter((x) => x !== id)
			: [...pickedIds, id];
	}

	function clearPicks() {
		pickedIds = [];
	}

	let running = $state(false);
	let currentRunId = $state<string | null>(null);
	let runTotal = $state<number | null>(null);
	let logLines = $state<string[]>([]);
	let liveItems = $state<Record<string, LiveItem>>({});
	let finalStatus = $state<'ok' | 'failed' | 'partial' | null>(null);
	let finalCounts = $state<{ processed: number; generated: number; skipped: number; failed: number } | null>(null);
	let runError = $state<string | null>(null);
	let runController: AbortController | null = null;

	const liveList = $derived(Object.entries(liveItems));
	const doneCount = $derived(
		liveList.filter(([, it]) => it.status === 'done' || it.status === 'failed' || it.status === 'skipped').length
	);
	const runProgressPct = $derived(
		runTotal && runTotal > 0 ? Math.round((doneCount / runTotal) * 100) : 0
	);

	function pushLog(s: string) {
		logLines = [...logLines, s].slice(-400);
	}

	function resetRunState() {
		currentRunId = null;
		runTotal = null;
		logLines = [];
		liveItems = {};
		finalStatus = null;
		finalCounts = null;
		runError = null;
	}

	async function refreshRuns() {
		try {
			const res = await fetch('/api/ai/design-prompts/runs');
			if (res.ok) {
				const body = (await res.json()) as { runs: RunSummary[] };
				runsList = body.runs;
			}
		} catch {
			/* ignore */
		}
	}

	function canStart(): { ok: true } | { ok: false; reason: string } {
		if (running) return { ok: false, reason: 'A run is already in progress' };
		if (mode === 'pick' && pickedIds.length === 0)
			return { ok: false, reason: 'Pick at least one business' };
		if (mode === 'limit' && (!Number.isInteger(limitValue) || limitValue < 1 || limitValue > 500))
			return { ok: false, reason: 'Limit must be an integer between 1 and 500' };
		if (
			!Number.isInteger(runConcurrency) ||
			runConcurrency < 1 ||
			runConcurrency > 32
		)
			return { ok: false, reason: 'Concurrency must be an integer between 1 and 32' };
		return { ok: true };
	}

	function handleEventPayload(evt: { type?: string } & Record<string, unknown>) {
		const type = evt.type;
		if (type === 'run_started') {
			currentRunId = String(evt.runId ?? '');
			runTotal = typeof evt.total === 'number' ? evt.total : null;
			const tid = String(evt.taskId ?? '');
			pushLog(
				`Run ${currentRunId} started${tid ? ` (${tid})` : ''} · ${runTotal ?? '?'} candidate(s)`
			);
		} else if (type === 'place_generating') {
			const id = String(evt.placeId);
			liveItems = {
				...liveItems,
				[id]: {
					name: String(evt.name ?? id),
					status: 'generating'
				}
			};
		} else if (type === 'place_done') {
			const id = String(evt.placeId);
			liveItems = {
				...liveItems,
				[id]: {
					name: String(evt.name ?? id),
					status: 'done',
					before: (evt.before ?? null) as string | null,
					after: String(evt.after ?? '')
				}
			};
		} else if (type === 'place_failed') {
			const id = String(evt.placeId);
			liveItems = {
				...liveItems,
				[id]: {
					name: String(evt.name ?? id),
					status: 'failed',
					error: String(evt.error ?? 'unknown')
				}
			};
		} else if (type === 'place_skipped') {
			const id = String(evt.placeId);
			liveItems = {
				...liveItems,
				[id]: {
					name: String(evt.name ?? id),
					status: 'skipped',
					reason: String(evt.reason ?? '')
				}
			};
		} else if (type === 'run_finished') {
			finalStatus = (evt.status as 'ok' | 'failed' | 'partial') ?? 'ok';
			finalCounts = (evt.counts as { processed: number; generated: number; skipped: number; failed: number }) ?? null;
			pushLog(`Run finished: status=${finalStatus}`);
		} else if (type === 'log') {
			pushLog(String(evt.line ?? ''));
		} else if (type === 'raw') {
			pushLog(`[raw] ${String(evt.line ?? '')}`);
		} else if (type === 'spawn_error') {
			runError = String(evt.error ?? 'Failed to spawn process');
			pushLog(`ERROR: ${runError}`);
		} else if (type === 'process_exit') {
			const code = evt.code;
			pushLog(`Process exited (code=${code ?? 'null'})`);
		}
	}

	async function startRun() {
		const check = canStart();
		if (!check.ok) {
			runError = check.reason;
			return;
		}
		resetRunState();
		running = true;
		runController = new AbortController();
		try {
			const body: Record<string, unknown> = {
				mode,
				taskId: selectedTaskId,
				concurrency: runConcurrency
			};
			if (mode === 'pick') body.placeIds = pickedIds;
			if (mode === 'limit') body.limit = limitValue;
			const res = await fetch('/api/ai/design-prompts/run', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
				signal: runController.signal
			});
			if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
			if (!res.body) throw new Error('No response body');
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			while (true) {
				const { value, done } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				let sep = buffer.indexOf('\n\n');
				while (sep !== -1) {
					const frame = buffer.slice(0, sep);
					buffer = buffer.slice(sep + 2);
					if (frame.trim()) {
						let dataStr = '';
						for (const line of frame.split('\n')) {
							if (line.startsWith('data:')) dataStr += line.slice(5).trimStart();
							else if (line.startsWith(':')) {
								/* heartbeat / comment */
							}
						}
						if (dataStr) {
							try {
								handleEventPayload(JSON.parse(dataStr));
							} catch {
								pushLog(`[parse] ${dataStr}`);
							}
						}
					}
					sep = buffer.indexOf('\n\n');
				}
			}
		} catch (err) {
			if ((err as { name?: string })?.name !== 'AbortError') {
				runError = err instanceof Error ? err.message : String(err);
				pushLog(`ERROR: ${runError}`);
			}
		} finally {
			running = false;
			runController = null;
			await refreshRuns();
		}
	}

	function cancelRun() {
		runController?.abort();
	}

	function fmtTime(iso: string): string {
		try {
			return new Date(iso).toLocaleString();
		} catch {
			return iso;
		}
	}

	function statusClass(st: ItemStatus): string {
		switch (st) {
			case 'generating':
				return 'bg-primary/15 text-primary';
			case 'done':
				return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
			case 'failed':
				return 'bg-destructive/15 text-destructive';
			case 'skipped':
				return 'bg-muted text-muted-foreground';
			default:
				return 'bg-muted text-muted-foreground';
		}
	}

	function runStatusBadgeClass(st: string): string {
		switch (st) {
			case 'ok':
				return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
			case 'partial':
				return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
			case 'failed':
				return 'bg-destructive/15 text-destructive';
			default:
				return 'bg-muted text-muted-foreground';
		}
	}
</script>

<svelte:head>
	<title>Website briefs · AI</title>
</svelte:head>

<div class="bg-background text-foreground flex min-h-screen flex-col">
	<header class="bg-card border-border flex shrink-0 flex-col border-b">
		<div class="max-w-full px-5 py-4">
			<h1 class="text-xl leading-none font-semibold tracking-tight">AI website briefs</h1>
			<p class="text-muted-foreground mt-1.5 text-sm">
				Configure tasks (design brief, website overview, …), choose inputs and model, then run
				Gemini per business. Each task writes to its own field on the place record; runs are
				logged with before/after text.
			</p>
		</div>
	</header>

	<div class="grid min-h-0 flex-1 grid-cols-1 gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
		<div class="flex min-w-0 flex-col gap-5">
			<Card>
				<CardHeader>
					<CardTitle>Settings</CardTitle>
					<CardDescription>
						Stored in <code class="text-[0.8rem]">mapsLeadsFetcher/settings.json</code>. Used by
						both the dashboard and the CLI.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex flex-col gap-5">
						<div class="flex flex-col gap-2">
							<div class="flex flex-wrap items-end justify-between gap-3">
								<div class="flex min-w-0 flex-1 flex-col gap-2">
									<Label>Task</Label>
									<ToggleGroup type="single" bind:value={selectedTaskId} class="flex-wrap">
										{#each taskOrder as tid (tid)}
											<ToggleGroupItem value={tid}>
												{tid === selectedTaskId
													? settings.label
													: (drafts[tid]?.label ?? tid)}
											</ToggleGroupItem>
										{/each}
									</ToggleGroup>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									class="shrink-0"
									onclick={openAddTaskDialog}
								>
									Add task
								</Button>
							</div>
							<p class="text-muted-foreground text-xs">
								CLI: <code class="text-[0.8rem]"
									>uv run generate_design_prompts.py --task {selectedTaskId} --workers 4</code
								>
							</p>
						</div>
						<div class="grid gap-4 md:grid-cols-2">
							<div class="flex flex-col gap-2">
								<Label for="task-label">Display label</Label>
								<Input id="task-label" bind:value={settings.label} />
							</div>
							<div class="flex flex-col gap-2">
								<Label for="output-field">Output field on place JSON</Label>
								<Input
									id="output-field"
									bind:value={settings.output_field}
									class="font-mono text-sm"
								/>
								<p class="text-muted-foreground text-xs">
									Letters, digits, underscore; errors go to <code class="text-[0.75rem]">{currentOutputField}_error</code>.
								</p>
							</div>
						</div>
						<div class="flex flex-col gap-2">
							<Label for="meta-prompt">Meta prompt</Label>
							<Textarea
								id="meta-prompt"
								bind:value={settings.meta_prompt}
								rows={8}
								class="font-mono text-sm"
							/>
							<p class="text-muted-foreground text-xs">
								{settings.meta_prompt.length} chars
							</p>
						</div>
						<div class="grid gap-4 md:grid-cols-2">
							<div class="flex flex-col gap-2">
								<Label for="model">Gemini model</Label>
								<Input id="model" bind:value={settings.model} />
								<p class="text-muted-foreground text-xs">
									Any model string accepted by <code>google.genai</code>.
								</p>
							</div>
							<div class="flex flex-col gap-2">
								<Label>Inputs sent to Gemini</Label>
								<div class="flex flex-col gap-2 pt-1">
									<label class="flex items-center gap-2 text-sm">
										<Checkbox bind:checked={settings.send_screenshot} />
										<span>Screenshot (PNG)</span>
									</label>
									<label class="flex items-center gap-2 text-sm">
										<Checkbox bind:checked={settings.send_markdown} />
										<span>Markdown extract</span>
									</label>
								</div>
								{#if !settings.send_screenshot && !settings.send_markdown}
									<p class="text-destructive text-xs">At least one must be enabled.</p>
								{/if}
							</div>
						</div>
						<div class="grid gap-4 md:grid-cols-2">
							<div class="flex flex-col gap-2">
								<Label for="subpage-md-mode">Sub-page markdown</Label>
								<select
									id="subpage-md-mode"
									class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
									bind:value={settings.subpage_markdown_mode}
									disabled={!settings.send_markdown}
								>
									<option value="none">None (home only)</option>
									<option value="all">All crawled sub-pages</option>
									<option value="recommended">AI-recommended sub-pages only</option>
								</select>
								<p class="text-muted-foreground text-xs">
									Requires <code class="text-[0.75rem]">website_crawl</code> +
									<code class="text-[0.75rem]">html_to_markdown.py</code>. Recommended mode needs a
									prior <code class="text-[0.75rem]">ai_subpages</code> run.
								</p>
							</div>
							<div class="flex flex-col gap-2">
								<Label for="rec-subpages-field">Recommended list field (place JSON)</Label>
								<Input
									id="rec-subpages-field"
									bind:value={settings.recommended_subpages_field}
									class="font-mono text-sm"
									disabled={!settings.send_markdown || settings.subpage_markdown_mode !== 'recommended'}
								/>
								<p class="text-muted-foreground text-xs">
									Structured output key with <code class="text-[0.75rem]">subpages[]</code> (default
									<code class="text-[0.75rem]">ai_subpages</code>).
								</p>
							</div>
						</div>
						{#if settingsError}
							<Alert variant="destructive">
								<AlertTitle>Failed to save</AlertTitle>
								<AlertDescription>{settingsError}</AlertDescription>
							</Alert>
						{/if}
						{#if settingsSaved && !settingsDirty}
							<p class="text-muted-foreground text-xs">Saved at {settingsSaved}</p>
						{/if}
						<div class="flex items-center gap-2">
							<Button
								onclick={saveSettings}
								disabled={savingSettings || !settingsDirty || settingsInvalid}
							>
								{savingSettings ? 'Saving…' : 'Save settings'}
							</Button>
							<Button variant="outline" onclick={resetSettings} disabled={!settingsDirty}>
								Revert
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Run</CardTitle>
					<CardDescription>
						{eligibleTotal} place(s) have a website screenshot. {newEligibleCount} without output
						for <strong class="text-foreground">{settings.label}</strong> (<code class="text-[0.75rem]"
							>{currentOutputField}</code
						>).
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex flex-col gap-4">
						<div class="flex flex-col gap-2">
							<Label>Scope</Label>
							<ToggleGroup type="single" bind:value={mode}>
								<ToggleGroupItem value="all-new">All without output</ToggleGroupItem>
								<ToggleGroupItem value="pick">Pick specific</ToggleGroupItem>
								<ToggleGroupItem value="limit">First N</ToggleGroupItem>
							</ToggleGroup>
						</div>

						{#if mode === 'all-new'}
							<Alert>
								<AlertDescription>
									Will process the {newEligibleCount} place(s) that have a screenshot but no value
									in <code>{currentOutputField}</code> yet. Places that already have text there are
									skipped.
								</AlertDescription>
							</Alert>
						{:else if mode === 'pick'}
							<div class="flex flex-col gap-2">
								<div class="flex items-center gap-2">
									<Input
										placeholder="Search businesses…"
										bind:value={pickSearch}
										class="max-w-sm"
									/>
									<span class="text-muted-foreground text-xs">
										{pickedIds.length} selected · {filteredPlaces.length} matching
									</span>
									{#if pickedIds.length > 0}
										<Button size="sm" variant="outline" onclick={clearPicks}>Clear</Button>
									{/if}
								</div>
								<ScrollArea class="border-border bg-background h-64 rounded-lg border">
									<TooltipProvider delayDuration={200}>
										<ul class="m-0 list-none p-0">
											{#each filteredPlaces as p (p.id)}
												<li
													class="border-border hover:bg-muted/40 border-b last:border-b-0"
												>
													<label
														class="flex cursor-pointer items-start gap-3 px-3 py-2 text-sm"
													>
														<Checkbox
															checked={pickedSet.has(p.id)}
															onCheckedChange={() => togglePick(p.id)}
														/>
														<span class="flex min-w-0 flex-1 flex-col gap-0.5">
															<span class="text-foreground truncate font-medium">
																{p.name}
															</span>
															{#if p.subtitle}
																<span
																	class="text-muted-foreground truncate text-xs"
																>
																	{p.subtitle}
																</span>
															{/if}
														</span>
														<div
															class="flex max-w-[min(18rem,45%)] shrink-0 flex-wrap items-center justify-end gap-1"
															role="presentation"
															onpointerdown={(e) => e.stopPropagation()}
															onclick={(e) => e.stopPropagation()}
														>
															{#each taskOrder as tid (tid)}
																{#if p.has_task_output[tid]}
																	<Tooltip>
																		<TooltipTrigger>
																			<Badge
																				variant="secondary"
																				class="shrink-0 text-xs"
																				>has {(
																					drafts[tid]?.label ?? humanizeSlug(tid)
																				).toLowerCase()}</Badge
																			>
																		</TooltipTrigger>
																		<TooltipContent
																			side="left"
																			class="!max-w-md max-h-80 w-[min(24rem,calc(100vw-2rem))] overflow-y-auto text-left font-normal [text-wrap:pretty]"
																		>
																			<div
																				class="text-background/80 border-b border-background/20 font-mono text-[0.65rem] leading-snug [text-wrap:wrap]"
																			>
																				{drafts[tid]?.output_field?.trim() ?? tid}
																			</div>
																			<div
																				class="text-background mt-2 whitespace-pre-wrap break-words [text-wrap:wrap]"
																			>
																				{p.task_output_preview[tid] ?? ''}
																			</div>
																		</TooltipContent>
																	</Tooltip>
																{/if}
															{/each}
														</div>
													</label>
												</li>
											{/each}
											{#if filteredPlaces.length === 0}
												<li class="text-muted-foreground px-3 py-4 text-center text-sm">
													No businesses match that search.
												</li>
											{/if}
										</ul>
									</TooltipProvider>
								</ScrollArea>
								<p class="text-muted-foreground text-xs">
									Picked businesses are always regenerated, overwriting any existing
									<code>{currentOutputField}</code>.
								</p>
							</div>
						{:else if mode === 'limit'}
							<div class="flex items-end gap-3">
								<div class="flex flex-col gap-1.5">
									<Label for="limit">Limit</Label>
									<Input
										id="limit"
										type="number"
										min={1}
										max={500}
										bind:value={limitValue}
										class="w-32"
									/>
								</div>
								<p class="text-muted-foreground pb-2 text-xs">
									Stops after {limitValue} successful generation(s). Skips places that already have
									<code>{currentOutputField}</code>.
								</p>
							</div>
						{/if}

						<div class="flex flex-wrap items-end gap-3">
							<div class="flex flex-col gap-1.5">
								<Label for="run-concurrency">Parallel API calls</Label>
								<Input
									id="run-concurrency"
									type="number"
									min={1}
									max={32}
									bind:value={runConcurrency}
									class="w-32"
								/>
							</div>
							<p class="text-muted-foreground max-w-md pb-2 text-xs">
								How many places to send to Gemini at once (1 = serial). With &ldquo;First N&rdquo;,
								batch size is capped so you never get more successes than the limit in one wave.
							</p>
						</div>

						<div class="flex items-center gap-2">
							<Button onclick={startRun} disabled={running || settingsDirty}>
								{running ? 'Running…' : 'Run'}
							</Button>
							{#if running}
								<Button variant="outline" onclick={cancelRun}>Cancel</Button>
							{/if}
							{#if settingsDirty}
								<span class="text-muted-foreground text-xs">
									Save settings before running.
								</span>
							{/if}
						</div>
					</div>
				</CardContent>
			</Card>

			{#if running || logLines.length > 0 || liveList.length > 0 || runError}
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-3">
							<span>Live run</span>
							{#if running}
								<Badge>running</Badge>
							{:else if finalStatus}
								<Badge class={runStatusBadgeClass(finalStatus)}>{finalStatus}</Badge>
							{/if}
							{#if currentRunId}
								<code class="text-muted-foreground ml-auto text-xs font-normal">
									{currentRunId}
								</code>
							{/if}
						</CardTitle>
						{#if runTotal !== null}
							<CardDescription>
								{doneCount} / {runTotal} processed · {runProgressPct}%
							</CardDescription>
						{/if}
					</CardHeader>
					<CardContent>
						<div class="flex flex-col gap-4">
							{#if runError}
								<Alert variant="destructive">
									<AlertTitle>Run error</AlertTitle>
									<AlertDescription>{runError}</AlertDescription>
								</Alert>
							{/if}

							{#if liveList.length > 0}
								<div class="flex flex-col gap-1.5">
									{#each liveList as [id, it] (id)}
										<div
											class="border-border bg-background flex items-start gap-3 rounded-md border px-3 py-2 text-sm"
										>
											<span
												class={`rounded px-1.5 py-0.5 text-[0.62rem] font-semibold tracking-wide uppercase ${statusClass(it.status)}`}
											>
												{it.status}
											</span>
											<span class="flex min-w-0 flex-1 flex-col gap-0.5">
												<span class="truncate font-medium">{it.name}</span>
												{#if it.status === 'done' && it.after}
													<details class="group">
														<summary
															class="text-muted-foreground cursor-pointer text-xs group-open:mb-1.5"
														>
															Show before / after
														</summary>
														<div class="grid gap-2 md:grid-cols-2">
															<div
																class="border-border bg-muted/30 rounded border p-2"
															>
																<div
																	class="text-muted-foreground mb-1 text-[0.62rem] font-semibold tracking-wide uppercase"
																>
																	Before
																</div>
																<p
																	class="text-foreground/90 m-0 text-[0.78rem] leading-relaxed whitespace-pre-wrap"
																>
																	{it.before ?? '(none)'}
																</p>
															</div>
															<div class="border-primary/30 bg-primary/5 rounded border p-2">
																<div
																	class="text-primary mb-1 text-[0.62rem] font-semibold tracking-wide uppercase"
																>
																	After
																</div>
																<p
																	class="text-foreground/90 m-0 text-[0.78rem] leading-relaxed whitespace-pre-wrap"
																>
																	{it.after}
																</p>
															</div>
														</div>
													</details>
												{:else if it.status === 'failed' && it.error}
													<span class="text-destructive text-xs">{it.error}</span>
												{:else if it.status === 'skipped' && it.reason}
													<span class="text-muted-foreground text-xs">
														reason: {it.reason}
													</span>
												{/if}
											</span>
											<code class="text-muted-foreground shrink-0 text-[0.68rem]">
												{id}
											</code>
										</div>
									{/each}
								</div>
							{/if}

							{#if logLines.length > 0}
								<details>
									<summary class="text-muted-foreground cursor-pointer text-sm">
										Raw log ({logLines.length})
									</summary>
									<pre
										class="bg-muted/30 text-muted-foreground mt-2 max-h-64 overflow-auto rounded border p-3 text-[0.7rem] leading-relaxed whitespace-pre-wrap"
									>{logLines.join('\n')}</pre>
								</details>
							{/if}

							{#if !running && currentRunId && finalStatus}
								<div class="flex items-center gap-2">
									<Button
										variant="outline"
										onclick={() => goto(`/ai/design-prompts/${currentRunId}`)}
									>
										Open run details
									</Button>
									{#if finalCounts}
										<span class="text-muted-foreground text-xs">
											generated {finalCounts.generated} · failed {finalCounts.failed} · skipped
											{finalCounts.skipped}
										</span>
									{/if}
								</div>
							{/if}
						</div>
					</CardContent>
				</Card>
			{/if}
		</div>

		<aside class="min-w-0">
			<Card>
				<CardHeader>
					<CardTitle>Recent runs</CardTitle>
					<CardDescription>
						Last {runsList.length} run(s), stored in
						<code class="text-[0.8rem]">runs.json</code>.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{#if runsList.length === 0}
						<p class="text-muted-foreground text-sm">No runs yet. Trigger one above.</p>
					{:else}
						<ul class="m-0 flex list-none flex-col gap-1.5 p-0">
							{#each runsList as r (r.id)}
								<li>
									<button
										type="button"
										onclick={() => goto(`/ai/design-prompts/${r.id}`)}
										class="border-border hover:border-primary hover:bg-muted/40 flex w-full flex-col gap-1.5 rounded-md border bg-transparent px-3 py-2.5 text-left transition-colors"
									>
										<div class="flex items-center justify-between gap-2">
											<span class="text-foreground text-sm font-medium">
												{r.settings_snapshot.label ?? r.task_id}
											</span>
											<span
												class={`rounded px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide uppercase ${runStatusBadgeClass(r.status)}`}
											>
												{r.status}
											</span>
										</div>
										<div class="text-muted-foreground text-[0.68rem]">
											{fmtTime(r.started_at)} · <code class="text-[0.65rem]">{r.task_id}</code>
										</div>
										<div class="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
											<span>mode: {r.scope.mode}</span>
											<span>·</span>
											<span>gen {r.counts.generated}</span>
											{#if r.counts.failed > 0}
												<span>·</span>
												<span class="text-destructive">fail {r.counts.failed}</span>
											{/if}
											{#if r.counts.skipped > 0}
												<span>·</span>
												<span>skip {r.counts.skipped}</span>
											{/if}
										</div>
										<div class="text-muted-foreground text-[0.68rem]">
											model: {r.settings_snapshot.model || '—'}
										</div>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</CardContent>
			</Card>
		</aside>
	</div>
</div>

<Dialog bind:open={addTaskOpen}>
	<DialogContent class="max-w-md">
		<DialogHeader>
			<DialogTitle>Add task</DialogTitle>
			<DialogDescription>
				Creates a new entry in <code class="text-[0.8rem]">settings.json</code> under
				<code class="text-[0.8rem]">ai_tasks</code>. You can adjust the meta prompt and model after it
				appears.
			</DialogDescription>
		</DialogHeader>
		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-2">
				<Label for="new-task-id">Task id</Label>
				<Input
					id="new-task-id"
					bind:value={newTaskIdInput}
					class="font-mono text-sm"
					placeholder="e.g. seo_summary"
					autocomplete="off"
				/>
				<p class="text-muted-foreground text-xs">
					Used as the CLI <code class="text-[0.75rem]">--task</code> value and as the default output
					field unless you override below.
				</p>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="new-task-label">Display label</Label>
				<Input
					id="new-task-label"
					bind:value={newTaskLabelInput}
					placeholder="Optional — derived from task id if empty"
				/>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="new-task-output">Output field (optional)</Label>
				<Input
					id="new-task-output"
					bind:value={newTaskOutputFieldInput}
					class="font-mono text-sm"
					placeholder="Defaults to task id"
				/>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="new-task-copy">Copy prompt &amp; model from</Label>
				<select
					id="new-task-copy"
					bind:value={addTaskCopyFromId}
					class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
				>
					{#each taskOrder as tid (tid)}
						<option value={tid}>{drafts[tid]?.label ?? tid}</option>
					{/each}
				</select>
			</div>
			{#if addTaskError}
				<Alert variant="destructive">
					<AlertTitle>Could not add task</AlertTitle>
					<AlertDescription>{addTaskError}</AlertDescription>
				</Alert>
			{/if}
		</div>
		<DialogFooter class="gap-2 sm:gap-0">
			<Button
				type="button"
				variant="outline"
				onclick={() => {
					addTaskOpen = false;
				}}
				disabled={addTaskSaving}
			>
				Cancel
			</Button>
			<Button type="button" onclick={() => void submitAddTask()} disabled={addTaskSaving}>
				{addTaskSaving ? 'Saving…' : 'Create task'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
