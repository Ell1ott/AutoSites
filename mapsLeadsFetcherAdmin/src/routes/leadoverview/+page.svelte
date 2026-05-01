<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';
	import type { Place, WebsiteCrawlPage } from '$lib/places.types';
	import { placeTitle, placeSubtitle } from '$lib/places';
	import {
		TABLE_COLUMNS,
		defaultVisibleColumns,
		type TableColumnId
	} from '$lib/leadoverviewTableColumns';
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import LeadOverviewDataTable from '$lib/components/lead-overview-data-table.svelte';
	import {
		Tabs,
		TabsContent,
		TabsList,
		TabsTrigger
	} from '$lib/components/ui/tabs/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		ToggleGroup,
		ToggleGroupItem
	} from '$lib/components/ui/toggle-group/index.js';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger
	} from '$lib/components/ui/select/index.js';
	import { Select as SelectBits } from 'bits-ui';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import {
		filterPlaces,
		isFilterActive,
		type CrawlFilter,
		type OpenNowFilter,
		type WebsiteFilter
	} from '$lib/leadOverviewFilters';
	import {
		Dialog,
		DialogTitle,
		DialogPortal,
		DialogOverlay,
		DialogContent,
		DialogHeader
	} from '$lib/components/ui/dialog/index.js';
	import { Dialog as BitsDialog } from 'bits-ui';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ArrowExpandDiagonal01Icon,
		Grid02Icon,
		Image01Icon,
		LayoutGridIcon,
		Link01Icon,
		MoreHorizontalIcon,
		TableIcon,
		ArrowDown01Icon
	} from '@hugeicons/core-free-icons';

	let { data }: { data: PageData } = $props();

	type ViewMode = 'smallGrid' | 'bigGrid' | 'table';

	const VIEW_STORAGE_KEY = 'leadoverview.viewMode';
	const COLS_STORAGE_KEY = 'leadoverview.tableColumns';
	const LEAD_RATING_STORAGE_KEY = 'leadoverview.leadRating';
	const LEGACY_INTERESTED_STORAGE_KEY = 'leadoverview.interested';

	let viewMode = $state<ViewMode>('smallGrid');
	let visibleColumns = $state<Record<TableColumnId, boolean>>(defaultVisibleColumns());
	/** Snapshot from server load; persists via POST to `lead_ratings.json`. */
	let leadRatingByPlaceId = $state<Record<string, number>>({ ...data.leadRatingByPlaceId });

	let selected = $state<Place | null>(null);
	let failedScreenshots = $state<Record<string, boolean>>({});
	let screenshotOverlayOpen = $state(false);
	let overlayImageSrc = $state<string | null>(null);
	let overlayCaption = $state<string | null>(null);
	let aiContentDialogOpen = $state(false);
	let aiContentTab = $state<string>('all');

	/** When crawl has both screenshots and links, sidebar uses Tabs between them. */
	let crawlMediaTab = $state<'screenshots' | 'links'>('screenshots');

	let searchQuery = $state('');
	let websiteFilter = $state<WebsiteFilter>('all');
	let crawlFilter = $state<CrawlFilter>('all');
	let minRating = $state('any');
	let minReviewCount = $state('any');
	let leadScoreGreaterThan = $state('any');
	let openNowFilter = $state<OpenNowFilter>('all');

	const filteredPlaces = $derived(
		filterPlaces(data.places, {
			search: searchQuery,
			website: websiteFilter,
			crawl: crawlFilter,
			minRating: minRating === 'any' ? '' : minRating,
			minReviewCount: minReviewCount === 'any' ? '' : minReviewCount,
			leadScoreGreaterThan: leadScoreGreaterThan === 'any' ? '' : leadScoreGreaterThan,
			leadRatingByPlaceId,
			openNow: openNowFilter
		})
	);

	const anyFilterOn = $derived(
		isFilterActive({
			search: searchQuery,
			website: websiteFilter,
			crawl: crawlFilter,
			minRating: minRating === 'any' ? '' : minRating,
			minReviewCount: minReviewCount === 'any' ? '' : minReviewCount,
			leadScoreGreaterThan: leadScoreGreaterThan === 'any' ? '' : leadScoreGreaterThan,
			openNow: openNowFilter
		})
	);

	const secondaryFiltersActive = $derived(
		crawlFilter !== 'all' ||
			minRating !== 'any' ||
			minReviewCount !== 'any' ||
			leadScoreGreaterThan !== 'any' ||
			openNowFilter !== 'all'
	);

	let moreFiltersOpen = $state(false);
	let moreFiltersRoot = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (!browser || !moreFiltersOpen) return;
		const closeOnPointerDown = (e: PointerEvent) => {
			const el = e.target;
			if (!(el instanceof Element)) return;
			if (moreFiltersRoot?.contains(el)) return;
			/* Select portals outside this subtree */
			if (el.closest('[data-slot="select-content"]')) return;
			moreFiltersOpen = false;
		};
		const onEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') moreFiltersOpen = false;
		};
		document.addEventListener('pointerdown', closeOnPointerDown, true);
		document.addEventListener('keydown', onEscape);
		return () => {
			document.removeEventListener('pointerdown', closeOnPointerDown, true);
			document.removeEventListener('keydown', onEscape);
		};
	});

	function clearFilters() {
		searchQuery = '';
		websiteFilter = 'all';
		crawlFilter = 'all';
		minRating = 'any';
		minReviewCount = 'any';
		leadScoreGreaterThan = 'any';
		openNowFilter = 'all';
	}

	$effect(() => {
		const s = selected;
		if (!s) return;
		if (!filteredPlaces.some((p) => p.id === s.id)) {
			selected = null;
		}
	});

	$effect(() => {
		void selected?.id;
		crawlMediaTab = 'screenshots';
	});

	$effect(() => {
		void selected?.id;
		aiContentTab = 'all';
	});

	/** Reads legacy `leadoverview.leadRating` + `leadoverview.interested` (true → 10). */
	function parseLeadRatingsFromLocalStorage(): Record<string, number> {
		const out: Record<string, number> = {};
		try {
			const rawRatings = localStorage.getItem(LEAD_RATING_STORAGE_KEY);
			if (rawRatings) {
				const parsed = JSON.parse(rawRatings) as Record<string, unknown>;
				for (const [k, v] of Object.entries(parsed)) {
					if (typeof v === 'number' && v >= 1 && v <= 10 && Number.isInteger(v)) out[k] = v;
				}
			}
		} catch {
			/* ignore */
		}
		try {
			const rawLegacy = localStorage.getItem(LEGACY_INTERESTED_STORAGE_KEY);
			if (rawLegacy) {
				const parsed = JSON.parse(rawLegacy) as Record<string, unknown>;
				for (const [k, v] of Object.entries(parsed)) {
					if (v === true && out[k] === undefined) out[k] = 10;
				}
			}
		} catch {
			/* ignore */
		}
		return out;
	}

	onMount(() => {
		const v = localStorage.getItem(VIEW_STORAGE_KEY);
		if (v === 'smallGrid' || v === 'bigGrid' || v === 'table') {
			viewMode = v;
		}
		const raw = localStorage.getItem(COLS_STORAGE_KEY);
		if (raw) {
			try {
				const parsed = JSON.parse(raw) as Record<string, boolean>;
				const next = { ...visibleColumns };
				for (const c of TABLE_COLUMNS) {
					if (typeof parsed[c.id] === 'boolean') {
						next[c.id] = parsed[c.id];
					}
				}
				visibleColumns = next;
			} catch {
				/* ignore */
			}
		}

		const hadLeadKeys =
			localStorage.getItem(LEAD_RATING_STORAGE_KEY) !== null ||
			localStorage.getItem(LEGACY_INTERESTED_STORAGE_KEY) !== null;
		if (!hadLeadKeys) return;

		const fromBrowser = parseLeadRatingsFromLocalStorage();
		if (Object.keys(fromBrowser).length > 0) {
			leadRatingByPlaceId = { ...leadRatingByPlaceId, ...fromBrowser };
			void persistLeadRatings();
		}
		localStorage.removeItem(LEAD_RATING_STORAGE_KEY);
		localStorage.removeItem(LEGACY_INTERESTED_STORAGE_KEY);
	});

	async function persistLeadRatings() {
		if (!browser) return;
		try {
			const res = await fetch('/api/lead-ratings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(leadRatingByPlaceId)
			});
			if (!res.ok) console.error('Failed to save lead ratings:', await res.text());
		} catch (e) {
			console.error(e);
		}
	}

	function clampLeadRating(n: number): number {
		return Math.min(10, Math.max(1, Math.round(n)));
	}

	/** `null` clears the score. */
	function setLeadRating(id: string, value: number | null) {
		const next = { ...leadRatingByPlaceId };
		if (value == null || Number.isNaN(value)) delete next[id];
		else next[id] = clampLeadRating(value);
		leadRatingByPlaceId = next;
		persistLeadRatings();
	}

	function persistViewMode() {
		if (browser) localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
	}

	function persistColumns() {
		if (browser) localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify(visibleColumns));
	}

	function selectAllTableColumns() {
		const next = { ...visibleColumns };
		for (const c of TABLE_COLUMNS) next[c.id] = true;
		visibleColumns = next;
		persistColumns();
	}

	function clearTableColumns() {
		const next = { ...visibleColumns };
		for (const c of TABLE_COLUMNS) next[c.id] = false;
		visibleColumns = next;
		persistColumns();
	}

	function resetTableColumnDefaults() {
		visibleColumns = defaultVisibleColumns();
		persistColumns();
	}

	function selectPlace(p: Place) {
		selected = p;
	}

	function closePanel() {
		screenshotOverlayOpen = false;
		overlayImageSrc = null;
		overlayCaption = null;
		aiContentDialogOpen = false;
		selected = null;
	}

	function openScreenshotOverlayFor(
		p: Place,
		opts?: { imageSrc?: string | null; caption?: string | null }
	) {
		selected = p;
		overlayImageSrc = opts?.imageSrc?.trim() ? opts.imageSrc.trim() : null;
		overlayCaption = opts?.caption?.trim() ? opts.caption.trim() : null;
		screenshotOverlayOpen = true;
	}

	function closeScreenshotOverlay() {
		screenshotOverlayOpen = false;
		overlayImageSrc = null;
		overlayCaption = null;
	}

	function crawlAssetUrl(rel: string): string {
		return `/api/screenshot-file?rel=${encodeURIComponent(rel)}`;
	}

	function crawlPageSummaryLabel(p: Place): string | null {
		const n = p.website_crawl?.pages?.length ?? 0;
		if (n < 2) return null;
		return `${n} pages`;
	}

	function truncateCrawlUrl(s: string, max = 52): string {
		const t = s.trim();
		if (t.length <= max) return t;
		return `${t.slice(0, max - 1)}…`;
	}

	function openCrawlShot(pg: WebsiteCrawlPage) {
		if (!selected) return;
		const path = pg.screenshot_path;
		if (!path?.trim()) return;
		openScreenshotOverlayFor(selected, {
			imageSrc: crawlAssetUrl(path.trim()),
			caption: pg.url_final ?? pg.url_requested ?? path.trim()
		});
	}

	function onImgError(placeId: string) {
		failedScreenshots = { ...failedScreenshots, [placeId]: true };
	}

	function hoursLines(p: Place): string[] {
		const w =
			p.regularOpeningHours?.weekdayDescriptions ??
			p.currentOpeningHours?.weekdayDescriptions;
		return w ?? [];
	}

	function hasWebsite(p: Place): boolean {
		return typeof p.websiteUri === 'string' && p.websiteUri.trim().length > 0;
	}

	function placeAiOutput(place: Place, outputField: string): string | undefined {
		const v = (place as Record<string, unknown>)[outputField];
		return typeof v === 'string' && v.trim().length > 0 ? v : undefined;
	}

	function placeAiOutputError(place: Place, outputField: string): string | undefined {
		const v = (place as Record<string, unknown>)[`${outputField}_error`];
		return typeof v === 'string' && v.trim().length > 0 ? v : undefined;
	}

</script>

<svelte:head>
	<title>Lead overview</title>
</svelte:head>

<div
	class="bg-background text-foreground flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden"
>
	<header class="bg-card border-border flex shrink-0 flex-col border-b">
		<div class="max-w-full px-5 py-4">
			<h1 class="text-xl leading-none font-semibold tracking-tight">Lead overview</h1>
			{#if data.meta.query}
				<p class="text-muted-foreground mt-1.5 text-sm">
					Query: <strong class="text-foreground">{data.meta.query}</strong>
					{#if data.meta.fetched_at}
						<span class="mx-1.5">·</span>
						Fetched {data.meta.fetched_at}
					{/if}
					<span class="mx-1.5">·</span>
					{#if anyFilterOn}
						<strong class="text-foreground">{filteredPlaces.length}</strong> of
						{data.places.length} places
					{:else}
						{data.places.length} places
					{/if}
				</p>
			{/if}
			<div class="mt-3.5 flex flex-wrap items-end gap-3" aria-label="Layout and filters">
				<div class="w-fit shrink-0">
					<Tabs
						bind:value={viewMode}
						onValueChange={() => persistViewMode()}
						aria-label="Layout"
					>
						<TabsList>
							<TabsTrigger value="smallGrid">
								<HugeiconsIcon icon={Grid02Icon} data-icon="inline-start" strokeWidth={2} />
								Small grid
							</TabsTrigger>
							<TabsTrigger value="bigGrid">
								<HugeiconsIcon
									icon={LayoutGridIcon}
									data-icon="inline-start"
									strokeWidth={2}
								/>
								Big grid
							</TabsTrigger>
							<TabsTrigger value="table">
								<HugeiconsIcon icon={TableIcon} data-icon="inline-start" strokeWidth={2} />
								Table
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>
				<Separator
					orientation="vertical"
					class="bg-border hidden h-9 w-px shrink-0 self-center sm:block"
				/>
				{#if viewMode === 'table'}
					<div class="flex w-fit min-w-0 shrink-0 self-end">
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button {...props} variant="outline" size="sm" class="h-8 gap-1.5">
										Columns
										<HugeiconsIcon
											icon={ArrowDown01Icon}
											data-icon="inline-end"
											strokeWidth={2}
										/>
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content class="w-56" align="start">
								<DropdownMenu.Label>Column visibility</DropdownMenu.Label>
								<DropdownMenu.Item onclick={selectAllTableColumns}>Select all</DropdownMenu.Item>
								<DropdownMenu.Item onclick={clearTableColumns}>Clear</DropdownMenu.Item>
								<DropdownMenu.Item onclick={resetTableColumnDefaults}>Defaults</DropdownMenu.Item>
								<DropdownMenu.Separator />
								{#each TABLE_COLUMNS as col (col.id)}
									<DropdownMenu.CheckboxItem
										closeOnSelect={false}
										bind:checked={
											() => visibleColumns[col.id],
											(v) => {
												visibleColumns = { ...visibleColumns, [col.id]: v };
												persistColumns();
											}
										}
									>
										{col.label}
									</DropdownMenu.CheckboxItem>
								{/each}
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
					<Separator
						orientation="vertical"
						class="bg-border hidden h-9 w-px shrink-0 self-center sm:block"
					/>
				{/if}
				<div class="flex min-w-0 flex-1 flex-wrap items-end gap-3 [min-width:min(100%,0)]">
					<div class="flex min-w-[12rem] max-w-md flex-1 flex-col gap-1.5">
						<span class="text-muted-foreground text-xs font-medium">Search</span>
						<Input
							type="search"
							placeholder="Name, address, or category"
							bind:value={searchQuery}
							class="w-full min-w-0"
							autocomplete="off"
						/>
					</div>
					<div class="flex flex-col gap-1.5">
						<span class="text-muted-foreground text-xs font-medium">Website</span>
						<ToggleGroup
							type="single"
							bind:value={websiteFilter}
							variant="outline"
							spacing={0}
						>
							<ToggleGroupItem value="all" aria-label="All websites">All</ToggleGroupItem>
							<ToggleGroupItem value="with" aria-label="With website">With</ToggleGroupItem>
							<ToggleGroupItem value="without" aria-label="Without website">Without</ToggleGroupItem>
						</ToggleGroup>
					</div>
					<div
						class="relative flex shrink-0 flex-col gap-1.5 self-end"
						bind:this={moreFiltersRoot}
					>
						<label
							for="leadoverview-more-filters-trigger"
							class={cn(
								'text-xs font-medium',
								moreFiltersOpen || secondaryFiltersActive ? 'text-foreground' : 'text-muted-foreground'
							)}
						>
							More filters
						</label>
						<Button
							type="button"
							id="leadoverview-more-filters-trigger"
							variant="outline"
							size="sm"
							class={cn(
								'h-8 w-[2.625rem] p-0',
								secondaryFiltersActive && !moreFiltersOpen
									? 'border-primary/40 bg-primary/5'
									: undefined
							)}
							onclick={() => (moreFiltersOpen = !moreFiltersOpen)}
							aria-expanded={moreFiltersOpen}
							aria-haspopup="dialog"
							aria-controls="leadoverview-more-filters-popup"
						>
							<HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
						</Button>
						{#if moreFiltersOpen}
							<div
								class="border-border bg-popover text-popover-foreground ring-foreground/5 dark:ring-foreground/10 absolute top-full left-0 z-[100] mt-1 flex max-h-[min(70vh,24rem)] w-[min(100vw-2rem,21rem)] min-w-[18rem] flex-col gap-3 overflow-y-auto rounded-3xl border p-3 shadow-lg ring-1 outline-none"
								id="leadoverview-more-filters-popup"
								role="dialog"
								aria-label="More filters"
								tabindex="-1"
							>
								<div class="flex flex-col gap-1.5">
									<span class="text-muted-foreground text-xs font-medium">Crawl</span>
									<ToggleGroup type="single" bind:value={crawlFilter} variant="outline" spacing={0}>
										<ToggleGroupItem value="all" aria-label="Any crawl data">All</ToggleGroupItem>
										<ToggleGroupItem value="multi" aria-label="At least two pages crawled">
											2+ pages
										</ToggleGroupItem>
										<ToggleGroupItem value="none" aria-label="Not a multi-page crawl">
											Not 2+
										</ToggleGroupItem>
									</ToggleGroup>
								</div>
								<div class="flex min-w-0 flex-col gap-1.5">
									<span class="text-muted-foreground text-xs font-medium" id="lo-min-rating">
										Min rating
									</span>
									<Select type="single" bind:value={minRating}>
										<SelectTrigger
											size="sm"
											class="w-full min-w-0 max-w-none"
											aria-labelledby="lo-min-rating"
										>
											<SelectBits.Value placeholder="Min rating" />
										</SelectTrigger>
										<SelectContent
											side="top"
											sideOffset={4}
											class="z-[120]"
										>
											<SelectItem value="any" label="Any" />
											<SelectItem value="3" label="3+ stars" />
											<SelectItem value="3.5" label="3.5+ stars" />
											<SelectItem value="4" label="4+ stars" />
											<SelectItem value="4.5" label="4.5+ stars" />
											<SelectItem value="5" label="5 stars" />
										</SelectContent>
									</Select>
								</div>
								<div class="flex min-w-0 flex-col gap-1.5">
									<span class="text-muted-foreground text-xs font-medium" id="lo-min-reviews">
										Review count
									</span>
									<Select type="single" bind:value={minReviewCount}>
										<SelectTrigger
											size="sm"
											class="w-full min-w-0 max-w-none"
											aria-labelledby="lo-min-reviews"
										>
											<SelectBits.Value placeholder="Review count" />
										</SelectTrigger>
										<SelectContent
											side="top"
											sideOffset={4}
											class="z-[120]"
										>
											<SelectItem value="any" label="Any" />
											<SelectItem value="5" label="5+ reviews" />
											<SelectItem value="10" label="10+ reviews" />
											<SelectItem value="25" label="25+ reviews" />
											<SelectItem value="50" label="50+ reviews" />
											<SelectItem value="100" label="100+ reviews" />
											<SelectItem value="250" label="250+ reviews" />
											<SelectItem value="500" label="500+ reviews" />
										</SelectContent>
									</Select>
								</div>
								<div class="flex min-w-0 flex-col gap-1.5">
									<span class="text-muted-foreground text-xs font-medium" id="lo-score-gt">
										Score &gt;
									</span>
									<Select type="single" bind:value={leadScoreGreaterThan}>
										<SelectTrigger
											size="sm"
											class="w-full min-w-0 max-w-none"
											aria-labelledby="lo-score-gt"
										>
											<SelectBits.Value placeholder="Score threshold" />
										</SelectTrigger>
										<SelectContent
											side="top"
											sideOffset={4}
											class="z-[120]"
										>
											<SelectItem value="any" label="Any" />
											{#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as n (n)}
												<SelectItem value={String(n)} label={`> ${n}`} />
											{/each}
										</SelectContent>
									</Select>
								</div>
								<div class="flex flex-col gap-1.5">
									<span class="text-muted-foreground text-xs font-medium">Open now</span>
									<ToggleGroup
										type="single"
										bind:value={openNowFilter}
										variant="outline"
										spacing={0}
									>
										<ToggleGroupItem value="all" aria-label="Any hours">All</ToggleGroupItem>
										<ToggleGroupItem value="open" aria-label="Open now">Open</ToggleGroupItem>
										<ToggleGroupItem value="closed" aria-label="Closed now">Closed</ToggleGroupItem>
									</ToggleGroup>
								</div>
							</div>
						{/if}
					</div>
					{#if anyFilterOn}
						<Button
							type="button"
							variant="secondary"
							size="sm"
							class="self-end"
							onclick={clearFilters}
						>
							Reset
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</header>

	<div
		class="flex w-full min-w-0 min-h-0 flex-1 flex-col overflow-hidden md:flex-row md:items-stretch"
	>
		<main
			class="min-h-0 min-w-0 flex-1 basis-0 overflow-y-auto overflow-x-hidden {viewMode ===
			'table'
				? 'px-0 py-0'
				: 'px-5 py-4 pb-8'}"
		>
			{#if viewMode === 'table'}
				<LeadOverviewDataTable
					places={filteredPlaces}
					bind:visibleColumns
					selectedId={selected?.id ?? null}
					{failedScreenshots}
					{leadRatingByPlaceId}
					onSelectPlace={selectPlace}
					onImgError={onImgError}
					onExpandScreenshot={openScreenshotOverlayFor}
					{setLeadRating}
					onColumnVisibilityPersist={persistColumns}
				/>
			{:else}
				<div
					class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]"
					class:gap-[1.15rem]={viewMode === 'bigGrid'}
					class:md:[grid-template-columns:repeat(auto-fill,minmax(400px,1fr))]={viewMode ===
						'bigGrid'}
				>
					{#each filteredPlaces as p (p.id)}
						<Card
							class={cn(
								'cursor-pointer gap-0 py-0 transition-colors',
								selected?.id === p.id && 'ring-primary ring-2'
							)}
							onclick={() => selectPlace(p)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									selectPlace(p);
								}
							}}
							tabindex={0}
							role="button"
						>
							<div
								class="bg-muted group/cover relative h-[clamp(6rem,24vw,12rem)] max-h-48 w-full shrink-0 overflow-hidden"
								class:md:h-[clamp(11rem,36vw,20rem)]={viewMode === 'bigGrid'}
								class:md:max-h-80={viewMode === 'bigGrid'}
							>
								{#if crawlPageSummaryLabel(p)}
									<Badge class="absolute top-1.5 left-1.5 z-[1] font-semibold" variant="default">
										{crawlPageSummaryLabel(p)}
									</Badge>
								{/if}
								{#if !hasWebsite(p)}
									<Badge
										class="absolute top-1.5 right-1.5 z-[1]"
										variant="secondary"
									>
										No website
									</Badge>
								{/if}
								{#if failedScreenshots[p.id]}
									<div
										class="text-muted-foreground flex h-full items-center justify-center text-sm"
										aria-hidden="true"
									>
										No screenshot
									</div>
								{:else}
									<img
										src="/api/screenshot/{p.id}"
										alt=""
										loading="lazy"
										class="block size-full object-cover object-top"
										onerror={() => onImgError(p.id)}
									/>
									<Button
										type="button"
										variant="secondary"
										size="icon-xs"
										class="absolute right-1.5 bottom-1.5 z-[2] opacity-0 transition-opacity group-hover/cover:opacity-100 group-focus-within/cover:opacity-100"
										aria-label="View screenshot fullscreen"
										onclick={(e) => {
											e.stopPropagation();
											openScreenshotOverlayFor(p);
										}}
									>
										<HugeiconsIcon icon={ArrowExpandDiagonal01Icon} strokeWidth={2} />
									</Button>
								{/if}
							</div>
							<CardContent class="flex flex-col gap-1 px-3.5 py-3">
								<span class="text-foreground text-[0.95rem] leading-snug font-semibold"
									>{placeTitle(p)}</span
								>
								{#if placeSubtitle(p)}
									<span class="text-muted-foreground line-clamp-2 text-xs leading-snug">
										{placeSubtitle(p)}
									</span>
								{/if}
							</CardContent>
						</Card>
					{/each}
				</div>
			{/if}
		</main>

		<aside
			class="border-border bg-card flex max-h-[45vh] min-h-0 w-full shrink-0 flex-col border-t md:max-h-none md:min-h-0 md:overflow-hidden md:w-[min(420px,40vw)] md:border-t-0 md:border-l"
			aria-label="Business details"
		>
			{#if selected}
				<div class="border-border flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4">
					<h2 class="text-[1.05rem] leading-snug font-semibold">{placeTitle(selected)}</h2>
					<div class="flex shrink-0 items-center gap-2">
						{#if data.aiTasks.length > 0}
							<Button
								variant="outline"
								size="sm"
								onclick={() => {
									aiContentTab = 'all';
									aiContentDialogOpen = true;
								}}
							>
								AI content
							</Button>
						{/if}
						<Button variant="outline" size="sm" onclick={closePanel}>Close</Button>
					</div>
				</div>

				<ScrollArea class="min-h-0 flex-1" orientation="vertical">
					<div class="flex flex-col gap-5 px-5 py-4">
						{#if selected.primaryTypeDisplayName?.text}
							<section class="flex flex-col gap-1.5">
								<h3 class="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase">
									Type
								</h3>
								<p class="text-sm leading-relaxed">{selected.primaryTypeDisplayName.text}</p>
							</section>
						{/if}

						{#if selected.businessStatus}
							<section class="flex flex-col gap-1.5">
								<h3 class="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase">
									Status
								</h3>
								<p class="text-sm leading-relaxed">{selected.businessStatus}</p>
							</section>
						{/if}

						{#if selected.rating != null || selected.userRatingCount != null}
							<section class="flex flex-col gap-1.5">
								<h3 class="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase">
									Rating
								</h3>
								<p class="text-sm leading-relaxed">
									{#if selected.rating != null}{selected.rating}★{/if}
									{#if selected.userRatingCount != null}
										<span class="text-muted-foreground">
											({selected.userRatingCount} reviews)</span
										>
									{/if}
								</p>
							</section>
						{/if}

						{#if selected.formattedAddress}
							<section class="flex flex-col gap-1.5">
								<h3 class="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase">
									Address
								</h3>
								<p class="text-sm leading-relaxed break-words">{selected.formattedAddress}</p>
							</section>
						{/if}

						{#if selected.nationalPhoneNumber || selected.internationalPhoneNumber}
							<section class="flex flex-col gap-1.5">
								<h3 class="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase">
									Phone
								</h3>
								<p class="text-sm leading-relaxed">
									{selected.internationalPhoneNumber ?? selected.nationalPhoneNumber}
								</p>
							</section>
						{/if}

						{#if selected.websiteUri}
							<section class="flex flex-col gap-1.5">
								<h3 class="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase">
									Website
								</h3>
								<p class="text-sm leading-relaxed break-all">
									<a
										href={selected.websiteUri}
										target="_blank"
										rel="noopener noreferrer"
										class="text-primary hover:underline"
									>
										{selected.websiteUri}
									</a>
								</p>
							</section>
						{/if}

						{#if data.aiTasks.length > 0}
							{#each data.aiTasks as task (task.id)}
								{@const out = placeAiOutput(selected, task.output_field)}
								{@const errOut = placeAiOutputError(selected, task.output_field)}
								{#if out !== undefined || errOut !== undefined}
									<section class="flex flex-col gap-1.5">
										<h3
											class="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase"
										>
											{task.label}
										</h3>
										{#if errOut}
											<p class="text-destructive m-0 text-[0.8rem] leading-relaxed">{errOut}</p>
										{/if}
										{#if out !== undefined}
											<p
												class="text-foreground/95 m-0 text-[0.88rem] leading-relaxed whitespace-pre-wrap"
											>
												{out}
											</p>
										{/if}
									</section>
								{/if}
							{/each}
						{/if}

						{#if selected.website_crawl}
							{@const crawl = selected.website_crawl}
							{@const crawlPages = crawl.pages ?? []}
							{@const crawlLinks = crawl.discovered_links ?? []}
							<section class="flex flex-col gap-2">
								<h3 class="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase">
									Website crawl
								</h3>
								{#if crawl.root?.url_final || crawl.root?.url_requested}
									<p class="text-muted-foreground text-xs leading-relaxed">
										{#if crawl.root?.url_final}
											<span class="text-muted-foreground font-semibold">Landing</span>
											<a
												href={crawl.root.url_final}
												target="_blank"
												rel="noopener noreferrer"
												class="text-primary ml-1 break-all hover:underline"
											>
												{crawl.root.url_final}
											</a>
										{:else if crawl.root?.url_requested}
											<span class="font-semibold">Requested</span>
											<span class="ml-1">{crawl.root.url_requested}</span>
										{/if}
										{#if crawl.root?.nav_seconds != null}
											<span class="text-muted-foreground">
												· {crawl.root.nav_seconds}s to load</span
											>
										{/if}
									</p>
								{/if}
								{#if crawlPages.length && crawlLinks.length}
									<Tabs bind:value={crawlMediaTab} aria-label="Website crawl">
										<TabsList>
											<TabsTrigger value="screenshots">
												<HugeiconsIcon icon={Image01Icon} data-icon="inline-start" strokeWidth={2} />
												Screenshots ({crawlPages.length})
											</TabsTrigger>
											<TabsTrigger value="links">
												<HugeiconsIcon icon={Link01Icon} data-icon="inline-start" strokeWidth={2} />
												Links ({crawlLinks.length})
											</TabsTrigger>
										</TabsList>
										<TabsContent value="screenshots">
											<div
												class="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2.5"
												role="list"
											>
												{#each crawlPages as pg, i (String(pg.url_final ?? pg.url_requested ?? i))}
													<div class="flex min-w-0 flex-col gap-1.5" role="listitem">
														{#if pg.screenshot_path?.trim()}
															<button
																type="button"
																class="bg-background border-border hover:border-primary hover:ring-primary/40 relative w-full cursor-zoom-in overflow-hidden rounded-lg border transition-colors hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_40%,transparent)]"
																onclick={() => openCrawlShot(pg)}
															>
																<img
																	src={crawlAssetUrl(pg.screenshot_path.trim())}
																	alt=""
																	loading="lazy"
																	class="aspect-[16/10] w-full object-cover object-top"
																/>
																<span
																	class="bg-background/90 text-muted-foreground absolute top-1.5 left-1.5 rounded px-1 py-0.5 text-[0.6rem] font-bold tracking-wide uppercase"
																	aria-hidden="true">d{pg.depth ?? 0}</span
																>
															</button>
														{:else}
															<div
																class="border-border bg-background flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-2 text-center"
															>
																<span
																	class="text-muted-foreground text-[0.72rem] font-semibold tracking-wide uppercase"
																	>No image</span
																>
																{#if pg.screenshot_error}
																	<span
																		class="text-muted-foreground text-[0.68rem] leading-snug break-words"
																		>{pg.screenshot_error}</span
																	>
																{/if}
															</div>
														{/if}
														<div class="flex min-w-0 flex-col gap-0.5">
															<span
																class="text-foreground text-[0.72rem] leading-snug break-all"
																title={pg.url_final ?? pg.url_requested ?? ''}
															>
																{truncateCrawlUrl(pg.url_final ?? pg.url_requested ?? '—')}
															</span>
															{#if pg.link_count_seen_on_page != null}
																<span class="text-muted-foreground text-[0.68rem]"
																	>{pg.link_count_seen_on_page} links on page</span
																>
															{/if}
														</div>
													</div>
												{/each}
											</div>
										</TabsContent>
										<TabsContent value="links">
											<div
												class="border-border bg-background max-h-56 overflow-auto rounded-lg border"
											>
												<ul class="m-0 list-none p-0">
													{#each crawlLinks as L, li (`${L.resolved_url ?? ''}-${li}`)}
														<li
															class="border-border hover:bg-muted/50 flex flex-col gap-1 border-b px-3 py-2 text-[0.78rem] last:border-b-0"
														>
															<div class="flex items-center gap-1.5">
																<span
																	class={cn(
																		'rounded px-1 py-0.5 text-[0.58rem] font-extrabold tracking-wide uppercase',
																		L.is_internal === true
																			? 'bg-primary/15 text-primary'
																			: 'bg-muted text-muted-foreground'
																	)}
																>
																	{L.is_internal === true ? 'In' : 'Out'}
																</span>
																<span
																	class="text-muted-foreground shrink-0 text-[0.65rem] lowercase"
																	>{L.tag ?? '—'}</span
																>
															</div>
															{#if L.resolved_url}
																<a
																	href={L.resolved_url}
																	target="_blank"
																	rel="noopener noreferrer"
																	class="text-primary min-w-0 leading-snug break-all hover:underline"
																>
																	{truncateCrawlUrl(L.resolved_url, 72)}
																</a>
															{/if}
															{#if L.text}
																<span
																	class="text-muted-foreground text-[0.72rem] leading-snug"
																	title={L.text}>{truncateCrawlUrl(L.text, 48)}</span
																>
															{/if}
														</li>
													{/each}
												</ul>
											</div>
										</TabsContent>
									</Tabs>
								{:else if crawlPages.length}
									<p class="text-muted-foreground text-xs">
										{crawlPages.length} screenshot{crawlPages.length === 1 ? '' : 's'}
									</p>
									<div class="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2.5" role="list">
										{#each crawlPages as pg, i (String(pg.url_final ?? pg.url_requested ?? i))}
											<div class="flex min-w-0 flex-col gap-1.5" role="listitem">
												{#if pg.screenshot_path?.trim()}
													<button
														type="button"
														class="bg-background border-border hover:border-primary hover:ring-primary/40 relative w-full cursor-zoom-in overflow-hidden rounded-lg border transition-colors hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_40%,transparent)]"
														onclick={() => openCrawlShot(pg)}
													>
														<img
															src={crawlAssetUrl(pg.screenshot_path.trim())}
															alt=""
															loading="lazy"
															class="aspect-[16/10] w-full object-cover object-top"
														/>
														<span
															class="bg-background/90 text-muted-foreground absolute top-1.5 left-1.5 rounded px-1 py-0.5 text-[0.6rem] font-bold tracking-wide uppercase"
															aria-hidden="true">d{pg.depth ?? 0}</span
														>
													</button>
												{:else}
													<div
														class="border-border bg-background flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-2 text-center"
													>
														<span class="text-muted-foreground text-[0.72rem] font-semibold tracking-wide uppercase"
															>No image</span
														>
														{#if pg.screenshot_error}
															<span class="text-muted-foreground text-[0.68rem] leading-snug break-words"
																>{pg.screenshot_error}</span
															>
														{/if}
													</div>
												{/if}
												<div class="flex min-w-0 flex-col gap-0.5">
													<span
														class="text-foreground text-[0.72rem] leading-snug break-all"
														title={pg.url_final ?? pg.url_requested ?? ''}
													>
														{truncateCrawlUrl(pg.url_final ?? pg.url_requested ?? '—')}
													</span>
													{#if pg.link_count_seen_on_page != null}
														<span class="text-muted-foreground text-[0.68rem]"
															>{pg.link_count_seen_on_page} links on page</span
														>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								{:else if crawlLinks.length}
									<p class="text-muted-foreground text-xs">
										{crawlLinks.length} discovered link{crawlLinks.length === 1 ? '' : 's'}
									</p>
									<div
										class="border-border bg-background max-h-56 overflow-auto rounded-lg border"
									>
										<ul class="m-0 list-none p-0">
											{#each crawlLinks as L, li (`${L.resolved_url ?? ''}-${li}`)}
												<li
													class="border-border hover:bg-muted/50 flex flex-col gap-1 border-b px-3 py-2 text-[0.78rem] last:border-b-0"
												>
													<div class="flex items-center gap-1.5">
														<span
															class={cn(
																'rounded px-1 py-0.5 text-[0.58rem] font-extrabold tracking-wide uppercase',
																L.is_internal === true
																	? 'bg-primary/15 text-primary'
																	: 'bg-muted text-muted-foreground'
															)}
														>
															{L.is_internal === true ? 'In' : 'Out'}
														</span>
														<span class="text-muted-foreground shrink-0 text-[0.65rem] lowercase"
															>{L.tag ?? '—'}</span
														>
													</div>
													{#if L.resolved_url}
														<a
															href={L.resolved_url}
															target="_blank"
															rel="noopener noreferrer"
															class="text-primary min-w-0 leading-snug break-all hover:underline"
														>
															{truncateCrawlUrl(L.resolved_url, 72)}
														</a>
													{/if}
													{#if L.text}
														<span
															class="text-muted-foreground text-[0.72rem] leading-snug"
															title={L.text}>{truncateCrawlUrl(L.text, 48)}</span
														>
													{/if}
												</li>
											{/each}
										</ul>
									</div>
								{/if}
							</section>
						{/if}

						{#if selected.googleMapsUri}
							<section class="flex flex-col gap-1.5">
								<h3 class="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase">
									Google Maps
								</h3>
								<p class="text-sm">
									<a
										href={selected.googleMapsUri}
										target="_blank"
										rel="noopener noreferrer"
										class="text-primary hover:underline"
									>
										Open in Maps
									</a>
								</p>
							</section>
						{/if}

						{#if selected.types?.length}
							<section class="flex flex-col gap-1.5">
								<h3 class="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase">
									Categories
								</h3>
								<p class="text-[0.85rem] leading-relaxed">{selected.types.join(', ')}</p>
							</section>
						{/if}

						{#if hoursLines(selected).length}
							<section class="flex flex-col gap-1.5">
								<h3 class="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase">
									Hours
								</h3>
								<ul class="text-[0.88rem] leading-relaxed [padding-inline-start:1.1rem]">
									{#each hoursLines(selected) as line}
										<li>{line}</li>
									{/each}
								</ul>
								{#if selected.regularOpeningHours?.openNow != null}
									<p class="text-muted-foreground text-xs">
										{selected.regularOpeningHours.openNow ? 'Open now' : 'Closed now'} (regular hours)
									</p>
								{/if}
							</section>
						{/if}

						{#if selected.reviews?.length}
							<section class="flex flex-col gap-2">
								<h3 class="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase">
									Recent reviews
								</h3>
								<ul class="m-0 flex list-none flex-col gap-3.5 p-0">
									{#each selected.reviews.slice(0, 5) as r}
										<li class="flex flex-col gap-1 text-[0.88rem]">
											{#if r.rating != null}
												<span class="text-primary font-semibold">{r.rating}★</span>
											{/if}
											{#if r.text?.text}
												<q class="text-foreground font-normal not-italic">{r.text.text}</q>
											{/if}
											{#if r.relativePublishTimeDescription}
												<span class="text-muted-foreground text-xs"
													>{r.relativePublishTimeDescription}</span
												>
											{/if}
										</li>
									{/each}
								</ul>
							</section>
						{/if}

						<details class="border-border bg-muted/30 rounded-lg border">
							<summary class="text-primary cursor-pointer px-3 py-2.5 text-sm font-medium">
								Full JSON record
							</summary>
							<Separator />
							<pre
								class="text-muted-foreground m-0 max-h-80 overflow-auto p-3 text-[0.68rem] leading-relaxed break-all whitespace-pre-wrap"
								>{JSON.stringify(selected, null, 2)}</pre
							>
						</details>
					</div>
				</ScrollArea>
			{:else}
				<div class="text-muted-foreground px-5 py-8 text-sm">
					<p>Select a business to see details.</p>
				</div>
			{/if}
		</aside>
	</div>

	<Dialog
		bind:open={screenshotOverlayOpen}
		onOpenChange={(open) => {
			if (!open) closeScreenshotOverlay();
		}}
	>
		{#if selected}
			<DialogPortal>
				<DialogOverlay class="bg-black/85 supports-backdrop-filter:backdrop-blur-none" />
				<BitsDialog.Content
					class={cn(
						'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
						'fixed inset-0 z-50 flex max-h-dvh w-full max-w-none flex-col gap-0 rounded-none border-0 bg-transparent p-0 shadow-none ring-0 outline-none',
						'translate-x-0 translate-y-0'
					)}
				>
					<DialogTitle class="sr-only">Screenshot fullscreen</DialogTitle>
					<div
						class="border-border bg-card/95 flex shrink-0 cursor-default items-center justify-between gap-4 border-b px-4 py-2.5"
						onclick={(e) => e.stopPropagation()}
						role="presentation"
					>
						<div class="flex min-w-0 flex-1 flex-col gap-0.5">
							<span class="text-foreground truncate text-sm font-semibold">
								{overlayCaption ?? placeTitle(selected)}
							</span>
							{#if overlayCaption}
								<span class="text-muted-foreground truncate text-xs font-medium">
									{placeTitle(selected)}
								</span>
							{/if}
						</div>
						<Button variant="outline" size="sm" onclick={closeScreenshotOverlay}>Close</Button>
					</div>
					<div
						class="flex min-h-0 flex-1 cursor-zoom-out items-start justify-center overflow-auto p-3"
						onclick={closeScreenshotOverlay}
						role="presentation"
					>
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
						<div role="presentation" class="inline-block" onclick={(e) => e.stopPropagation()}>
							<img
								src={overlayImageSrc ?? `/api/screenshot/${selected.id}`}
								alt={overlayCaption
									? `Screenshot: ${overlayCaption}`
									: `Screenshot of ${placeTitle(selected)}`}
								class="h-auto w-[min(90vw,1400px)] max-w-full shrink-0 rounded shadow-2xl"
							/>
						</div>
					</div>
				</BitsDialog.Content>
			</DialogPortal>
		{/if}
	</Dialog>

	<Dialog bind:open={aiContentDialogOpen}>
		{#if selected && data.aiTasks.length > 0}
			<DialogContent
				class="flex max-h-[min(90vh,800px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
				showCloseButton={true}
			>
				<DialogHeader class="border-border shrink-0 space-y-1 border-b px-6 py-5 pr-14">
					<DialogTitle>AI-generated content</DialogTitle>
					<p class="text-muted-foreground text-sm font-normal leading-snug">
						{placeTitle(selected)}
					</p>
				</DialogHeader>

				<Tabs bind:value={aiContentTab} class="flex min-h-0 flex-1 flex-col gap-0">
					<div class="border-border shrink-0 border-b px-6 py-3">
						<TabsList class="h-auto min-h-9 max-w-full flex-wrap justify-start gap-1">
							<TabsTrigger value="all">All</TabsTrigger>
							{#each data.aiTasks as task (task.id)}
								<TabsTrigger value={task.id}>{task.label}</TabsTrigger>
							{/each}
						</TabsList>
					</div>

					<TabsContent value="all" class="mt-0 min-h-0 flex-1">
						<ScrollArea class="h-[min(55vh,440px)] px-6 py-4" orientation="vertical">
							{@const hasAny = data.aiTasks.some(
								(t) =>
									placeAiOutput(selected!, t.output_field) !== undefined ||
									placeAiOutputError(selected!, t.output_field) !== undefined
							)}
							<div class="flex flex-col gap-5">
								{#if !hasAny}
									<p class="text-muted-foreground m-0 text-sm">
										No AI output stored for this business yet.
									</p>
								{:else}
									{#each data.aiTasks as task (task.id)}
										{@const out = placeAiOutput(selected, task.output_field)}
										{@const errOut = placeAiOutputError(selected, task.output_field)}
										{#if out !== undefined || errOut !== undefined}
											<section class="flex flex-col gap-1.5">
												<h3
													class="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase"
												>
													{task.label}
												</h3>
												{#if errOut}
													<p class="text-destructive m-0 text-[0.8rem] leading-relaxed">{errOut}</p>
												{/if}
												{#if out !== undefined}
													<p
														class="text-foreground/95 m-0 text-[0.88rem] leading-relaxed whitespace-pre-wrap"
													>
														{out}
													</p>
												{/if}
											</section>
										{/if}
									{/each}
								{/if}
							</div>
						</ScrollArea>
					</TabsContent>

					{#each data.aiTasks as task (task.id)}
						{@const out = placeAiOutput(selected, task.output_field)}
						{@const errOut = placeAiOutputError(selected, task.output_field)}
						<TabsContent value={task.id} class="mt-0 min-h-0 flex-1">
							<ScrollArea class="h-[min(55vh,440px)] px-6 py-4" orientation="vertical">
								<section class="flex flex-col gap-1.5">
									<h3
										class="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase"
									>
										{task.label}
									</h3>
									{#if errOut}
										<p class="text-destructive m-0 text-[0.8rem] leading-relaxed">{errOut}</p>
									{:else if out === undefined}
										<p class="text-muted-foreground m-0 text-sm">
											No output stored for this task yet.
										</p>
									{:else}
										<p
											class="text-foreground/95 m-0 text-[0.88rem] leading-relaxed whitespace-pre-wrap"
										>
											{out}
										</p>
									{/if}
								</section>
							</ScrollArea>
						</TabsContent>
					{/each}
				</Tabs>
			</DialogContent>
		{/if}
	</Dialog>
</div>
