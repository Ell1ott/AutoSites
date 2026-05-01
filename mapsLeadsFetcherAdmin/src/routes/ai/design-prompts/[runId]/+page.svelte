<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';

	let { data }: { data: PageData } = $props();
	const run = $derived(data.run);

	type ItemFilter = 'all' | 'ok' | 'failed' | 'skipped';
	let filter = $state<ItemFilter>('all');

	const filteredItems = $derived(
		filter === 'all' ? run.items : run.items.filter((it) => it.status === filter)
	);

	function fmtTime(iso: string): string {
		try {
			return new Date(iso).toLocaleString();
		} catch {
			return iso;
		}
	}

	function durationLabel(a: string, b: string): string {
		const ms = new Date(b).getTime() - new Date(a).getTime();
		if (!Number.isFinite(ms) || ms < 0) return '—';
		if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
		const m = Math.floor(ms / 60_000);
		const s = Math.round((ms % 60_000) / 1000);
		return `${m}m ${s}s`;
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

	function itemStatusBadgeClass(st: string): string {
		switch (st) {
			case 'ok':
				return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
			case 'failed':
				return 'bg-destructive/15 text-destructive';
			case 'skipped':
				return 'bg-muted text-muted-foreground';
			default:
				return 'bg-muted text-muted-foreground';
		}
	}
</script>

<svelte:head>
	<title>Run {run.id} · Website briefs</title>
</svelte:head>

<div class="bg-background text-foreground flex min-h-screen flex-col">
	<header class="bg-card border-border flex shrink-0 flex-col border-b">
		<div class="flex max-w-full items-start justify-between gap-4 px-5 py-4">
			<div class="flex min-w-0 flex-col gap-1.5">
				<div class="flex items-center gap-3">
					<h1 class="text-xl leading-none font-semibold tracking-tight">Run detail</h1>
					<span
						class={`rounded px-1.5 py-0.5 text-[0.62rem] font-semibold tracking-wide uppercase ${runStatusBadgeClass(run.status)}`}
					>
						{run.status}
					</span>
				</div>
				<code class="text-muted-foreground text-xs">{run.id}</code>
				<p class="text-muted-foreground text-sm">
					Started {fmtTime(run.started_at)} · took {durationLabel(
						run.started_at,
						run.finished_at
					)}
				</p>
			</div>
			<Button variant="outline" href="/ai/design-prompts">Back</Button>
		</div>
	</header>

	<div class="grid min-h-0 flex-1 grid-cols-1 gap-5 px-5 py-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
		<aside class="flex min-w-0 flex-col gap-5">
			<Card>
				<CardHeader>
					<CardTitle>Scope</CardTitle>
				</CardHeader>
				<CardContent>
					<dl class="text-sm">
						<div class="flex justify-between gap-3 py-1">
							<dt class="text-muted-foreground">Mode</dt>
							<dd class="font-medium">{run.scope.mode}</dd>
						</div>
						{#if typeof run.scope.limit === 'number'}
							<div class="flex justify-between gap-3 py-1">
								<dt class="text-muted-foreground">Limit</dt>
								<dd class="font-medium">{run.scope.limit}</dd>
							</div>
						{/if}
						{#if run.scope.force}
							<div class="flex justify-between gap-3 py-1">
								<dt class="text-muted-foreground">Force</dt>
								<dd class="font-medium">yes</dd>
							</div>
						{/if}
						{#if run.scope.subpage_markdown_mode}
							<div class="flex justify-between gap-3 py-1">
								<dt class="text-muted-foreground">Sub-page MD</dt>
								<dd class="font-mono text-xs font-medium">{run.scope.subpage_markdown_mode}</dd>
							</div>
						{/if}
						{#if run.scope.recommended_subpages_field}
							<div class="flex justify-between gap-3 py-1">
								<dt class="text-muted-foreground">Rec. subpages field</dt>
								<dd class="font-mono text-xs font-medium">{run.scope.recommended_subpages_field}</dd>
							</div>
						{/if}
						{#if run.scope.subpage_markdown_mode}
							<div class="flex justify-between gap-3 py-1">
								<dt class="text-muted-foreground">Sub-page MD</dt>
								<dd class="font-medium">{run.scope.subpage_markdown_mode}</dd>
							</div>
						{/if}
						{#if run.scope.recommended_subpages_field}
							<div class="flex justify-between gap-3 py-1">
								<dt class="text-muted-foreground">Rec. subpages field</dt>
								<dd class="font-mono text-xs">{run.scope.recommended_subpages_field}</dd>
							</div>
						{/if}
						{#if run.scope.place_ids && run.scope.place_ids.length > 0}
							<div class="py-1">
								<dt class="text-muted-foreground mb-1">Picked ids</dt>
								<dd>
									<ul
										class="m-0 flex list-none flex-wrap gap-1 p-0 text-[0.7rem]"
									>
										{#each run.scope.place_ids as id (id)}
											<li
												class="border-border bg-muted/30 rounded border px-1.5 py-0.5 font-mono"
											>
												{id}
											</li>
										{/each}
									</ul>
								</dd>
							</div>
						{/if}
					</dl>
					<Separator class="my-3" />
					<dl class="text-sm">
						<div class="flex justify-between gap-3 py-1">
							<dt class="text-muted-foreground">Processed</dt>
							<dd class="font-medium">{run.counts.processed}</dd>
						</div>
						<div class="flex justify-between gap-3 py-1">
							<dt class="text-muted-foreground">Generated</dt>
							<dd class="font-medium">{run.counts.generated}</dd>
						</div>
						<div class="flex justify-between gap-3 py-1">
							<dt class="text-muted-foreground">Skipped</dt>
							<dd class="font-medium">{run.counts.skipped}</dd>
						</div>
						<div class="flex justify-between gap-3 py-1">
							<dt class="text-muted-foreground">Failed</dt>
							<dd class="font-medium">{run.counts.failed}</dd>
						</div>
					</dl>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Settings snapshot</CardTitle>
					<CardDescription>Exact config used by this run.</CardDescription>
				</CardHeader>
				<CardContent>
					<dl class="text-sm">
						<div class="flex justify-between gap-3 py-1">
							<dt class="text-muted-foreground">Task</dt>
							<dd class="font-medium">{run.tool}</dd>
						</div>
						{#if 'label' in run.settings_snapshot && run.settings_snapshot.label}
							<div class="flex justify-between gap-3 py-1">
								<dt class="text-muted-foreground">Label</dt>
								<dd class="text-xs font-medium">{run.settings_snapshot.label}</dd>
							</div>
						{/if}
						{#if 'output_field' in run.settings_snapshot && run.settings_snapshot.output_field}
							<div class="flex justify-between gap-3 py-1">
								<dt class="text-muted-foreground">Output field</dt>
								<dd class="font-mono text-xs">{run.settings_snapshot.output_field}</dd>
							</div>
						{/if}
						<div class="flex justify-between gap-3 py-1">
							<dt class="text-muted-foreground">Model</dt>
							<dd class="font-mono text-xs">{run.settings_snapshot.model}</dd>
						</div>
						<div class="flex justify-between gap-3 py-1">
							<dt class="text-muted-foreground">Screenshot sent</dt>
							<dd class="font-medium">{run.settings_snapshot.send_screenshot ? 'yes' : 'no'}</dd>
						</div>
						<div class="flex justify-between gap-3 py-1">
							<dt class="text-muted-foreground">Markdown sent</dt>
							<dd class="font-medium">{run.settings_snapshot.send_markdown ? 'yes' : 'no'}</dd>
						</div>
						{#if 'subpage_markdown_mode' in run.settings_snapshot && run.settings_snapshot.subpage_markdown_mode}
							<div class="flex justify-between gap-3 py-1">
								<dt class="text-muted-foreground">Sub-page markdown</dt>
								<dd class="font-mono text-xs font-medium">{run.settings_snapshot.subpage_markdown_mode}</dd>
							</div>
						{/if}
						{#if 'recommended_subpages_field' in run.settings_snapshot && run.settings_snapshot.recommended_subpages_field}
							<div class="flex justify-between gap-3 py-1">
								<dt class="text-muted-foreground">Rec. subpages field</dt>
								<dd class="font-mono text-xs font-medium">{run.settings_snapshot.recommended_subpages_field}</dd>
							</div>
						{/if}
					</dl>
					<Separator class="my-3" />
					<div>
						<div class="text-muted-foreground mb-1 text-[0.62rem] font-semibold tracking-wide uppercase">
							Meta prompt
						</div>
						<pre
							class="bg-muted/30 text-foreground/90 m-0 max-h-80 overflow-auto rounded border p-3 text-[0.72rem] leading-relaxed whitespace-pre-wrap"
						>{run.settings_snapshot.meta_prompt}</pre>
					</div>
				</CardContent>
			</Card>
		</aside>

		<div class="flex min-w-0 flex-col gap-5">
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-3">
						<span>Items</span>
						<Badge variant="secondary">{run.items.length}</Badge>
					</CardTitle>
					<div class="flex items-center gap-2 pt-2">
						<Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onclick={() => (filter = 'all')}>All</Button>
						<Button size="sm" variant={filter === 'ok' ? 'default' : 'outline'} onclick={() => (filter = 'ok')}>
							OK ({run.items.filter((i) => i.status === 'ok').length})
						</Button>
						<Button size="sm" variant={filter === 'failed' ? 'default' : 'outline'} onclick={() => (filter = 'failed')}>
							Failed ({run.items.filter((i) => i.status === 'failed').length})
						</Button>
						<Button size="sm" variant={filter === 'skipped' ? 'default' : 'outline'} onclick={() => (filter = 'skipped')}>
							Skipped ({run.items.filter((i) => i.status === 'skipped').length})
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{#if filteredItems.length === 0}
						<p class="text-muted-foreground text-sm">No items match the current filter.</p>
					{:else}
						<ul class="m-0 flex list-none flex-col gap-4 p-0">
							{#each filteredItems as it (it.place_id)}
								<li class="border-border bg-background/50 flex flex-col gap-2 rounded-lg border p-3">
									<div class="flex items-center gap-3">
										<span
											class={`rounded px-1.5 py-0.5 text-[0.62rem] font-semibold tracking-wide uppercase ${itemStatusBadgeClass(it.status)}`}
										>
											{it.status}
										</span>
										<span class="text-foreground font-medium">{it.place_name}</span>
										<code class="text-muted-foreground ml-auto text-[0.68rem]">{it.place_id}</code>
									</div>
									{#if it.status === 'failed'}
										<p class="text-destructive m-0 text-xs">{it.error}</p>
									{/if}
									{#if it.inputs_used}
										<div class="border-border bg-muted/20 rounded border p-3">
											<div class="text-muted-foreground mb-2 text-[0.62rem] font-semibold tracking-wide uppercase">
												Inputs sent
											</div>
											<dl class="m-0 space-y-2 text-sm">
												<div>
													<dt class="text-muted-foreground text-xs">Screenshot</dt>
													<dd class="m-0 mt-0.5">
														{#if it.inputs_used.screenshot_path}
															<code class="text-[0.72rem] break-all">{it.inputs_used.screenshot_path}</code>
														{:else}
															<span class="text-muted-foreground text-xs">Not sent</span>
														{/if}
													</dd>
												</div>
												<div>
													<dt class="text-muted-foreground text-xs">Markdown</dt>
													<dd class="m-0 mt-0.5">
														{#if it.inputs_used.markdown_files.length === 0}
															<span class="text-muted-foreground text-xs">None</span>
														{:else}
															<ul class="m-0 list-none space-y-1.5 p-0">
																{#each it.inputs_used.markdown_files as mf (mf.path + mf.role)}
																	<li class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
																		<span
																			class="bg-muted rounded px-1.5 py-0.5 text-[0.62rem] font-semibold tracking-wide uppercase"
																		>
																			{mf.role}
																		</span>
																		<code class="text-[0.72rem] break-all">{mf.path}</code>
																		{#if mf.role === 'subpage' && mf.url}
																			<span class="text-muted-foreground text-[0.68rem] break-all"
																				>({mf.url})</span
																			>
																		{/if}
																	</li>
																{/each}
															</ul>
														{/if}
													</dd>
												</div>
											</dl>
										</div>
									{/if}
									{#if it.before !== null || it.after !== null}
										<div class="grid gap-3 md:grid-cols-2">
											<div class="border-border bg-muted/30 rounded border p-3">
												<div class="text-muted-foreground mb-1.5 text-[0.62rem] font-semibold tracking-wide uppercase">
													Before
												</div>
												<p class="text-foreground/90 m-0 text-[0.8rem] leading-relaxed whitespace-pre-wrap">
													{it.before ?? '(none)'}
												</p>
											</div>
											<div class="border-primary/30 bg-primary/5 rounded border p-3">
												<div class="text-primary mb-1.5 text-[0.62rem] font-semibold tracking-wide uppercase">
													After
												</div>
												<p class="text-foreground/90 m-0 text-[0.8rem] leading-relaxed whitespace-pre-wrap">
													{it.after ?? '(none)'}
												</p>
											</div>
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</CardContent>
			</Card>
		</div>
	</div>
</div>
