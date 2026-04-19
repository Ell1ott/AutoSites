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

	let { data }: { data: PageData } = $props();

	type ViewMode = 'smallGrid' | 'bigGrid' | 'table';

	const VIEW_STORAGE_KEY = 'leadoverview.viewMode';
	const COLS_STORAGE_KEY = 'leadoverview.tableColumns';

	let viewMode = $state<ViewMode>('smallGrid');
	let visibleColumns = $state<Record<TableColumnId, boolean>>(defaultVisibleColumns());
	let columnDetailsOpen = $state(false);

	let selected = $state<Place | null>(null);
	let failedScreenshots = $state<Record<string, boolean>>({});
	let screenshotOverlayOpen = $state(false);
	let overlayImageSrc = $state<string | null>(null);
	let overlayCaption = $state<string | null>(null);

	const activeColumns = $derived(TABLE_COLUMNS.filter((c) => visibleColumns[c.id]));

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
	});

	function persistViewMode() {
		if (browser) localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
	}

	function persistColumns() {
		if (browser) localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify(visibleColumns));
	}

	function setViewMode(mode: ViewMode) {
		viewMode = mode;
		persistViewMode();
	}

	function selectPlace(p: Place) {
		selected = p;
	}

	function closePanel() {
		screenshotOverlayOpen = false;
		overlayImageSrc = null;
		overlayCaption = null;
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

	$effect(() => {
		if (!screenshotOverlayOpen) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	});

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

	function openNowValue(p: Place): boolean | undefined {
		const reg = p.regularOpeningHours?.openNow;
		const cur = p.currentOpeningHours?.openNow;
		if (reg !== undefined) return reg;
		return cur;
	}

	function placeCoords(p: Place): string {
		const loc = p.location;
		if (loc?.latitude != null && loc?.longitude != null) {
			return `${loc.latitude}, ${loc.longitude}`;
		}
		return '';
	}

	function plusCodeText(p: Place): string {
		return p.plusCode?.globalCode ?? p.plusCode?.compoundCode ?? '';
	}

	function priceLevelText(p: Place): string {
		return typeof p.priceLevel === 'string' ? p.priceLevel : '';
	}

	function hoursSummary(p: Place): string {
		return hoursLines(p).join('; ');
	}

	function typesSummary(p: Place, maxLen = 72): string {
		const t = p.types?.join(' · ') ?? '';
		if (t.length <= maxLen) return t;
		return `${t.slice(0, maxLen - 1)}…`;
	}

	function toggleColumn(id: TableColumnId) {
		visibleColumns = { ...visibleColumns, [id]: !visibleColumns[id] };
		persistColumns();
	}

	function selectAllColumns() {
		const next = { ...visibleColumns };
		for (const c of TABLE_COLUMNS) next[c.id] = true;
		visibleColumns = next;
		persistColumns();
	}

	function clearAllColumns() {
		const next = { ...visibleColumns };
		for (const c of TABLE_COLUMNS) next[c.id] = false;
		visibleColumns = next;
		persistColumns();
	}

	function resetColumnDefaults() {
		visibleColumns = defaultVisibleColumns();
		persistColumns();
	}

	function ratingLabel(p: Place): string {
		const parts: string[] = [];
		if (p.rating != null) parts.push(`${p.rating}★`);
		if (p.userRatingCount != null) parts.push(`${p.userRatingCount} reviews`);
		return parts.join(' · ');
	}
</script>

<svelte:head>
	<title>Lead overview</title>
</svelte:head>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && screenshotOverlayOpen) {
			e.preventDefault();
			closeScreenshotOverlay();
			return;
		}
		if (e.key === 'Escape' && columnDetailsOpen) {
			e.preventDefault();
			columnDetailsOpen = false;
		}
	}}
/>

<div class="app">
	<header class="header">
		<div class="header-inner">
			<h1>Lead overview</h1>
			{#if data.meta.query}
				<p class="meta">
					Query: <strong>{data.meta.query}</strong>
					{#if data.meta.fetched_at}
						<span class="meta-sep">·</span>
						Fetched {data.meta.fetched_at}
					{/if}
					<span class="meta-sep">·</span>
					{data.places.length} places
				</p>
			{/if}
			<div class="header-toolbar">
				<div class="view-toggle" role="group" aria-label="Layout">
					<button
						type="button"
						class="view-toggle-btn"
						class:view-toggle-btn--active={viewMode === 'smallGrid'}
						onclick={() => setViewMode('smallGrid')}
					>
						Small grid
					</button>
					<button
						type="button"
						class="view-toggle-btn"
						class:view-toggle-btn--active={viewMode === 'bigGrid'}
						onclick={() => setViewMode('bigGrid')}
					>
						Big grid
					</button>
					<button
						type="button"
						class="view-toggle-btn"
						class:view-toggle-btn--active={viewMode === 'table'}
						onclick={() => setViewMode('table')}
					>
						Table
					</button>
				</div>
				{#if viewMode === 'table'}
					<details class="cols-dropdown" bind:open={columnDetailsOpen}>
						<summary class="cols-dropdown-summary">Columns</summary>
						<div class="cols-dropdown-panel">
							<div class="cols-dropdown-actions">
								<button type="button" class="linkish" onclick={selectAllColumns}>Select all</button>
								<button type="button" class="linkish" onclick={clearAllColumns}>Clear</button>
								<button type="button" class="linkish" onclick={resetColumnDefaults}>Defaults</button>
							</div>
							<ul class="cols-check-list">
								{#each TABLE_COLUMNS as col (col.id)}
									<li>
										<label class="cols-check">
											<input
												type="checkbox"
												checked={visibleColumns[col.id]}
												onchange={() => toggleColumn(col.id)}
											/>
											<span>{col.label}</span>
										</label>
									</li>
								{/each}
							</ul>
						</div>
					</details>
				{/if}
			</div>
		</div>
	</header>

	<div class="body">
		<main class="main" class:main--big-grid={viewMode === 'bigGrid'}>
			{#if viewMode === 'table'}
				<div class="table-scroll">
					<table class="data-table">
						<thead>
							<tr>
								{#each activeColumns as col (col.id)}
									<th scope="col">{col.label}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each data.places as p (p.id)}
								<tr
									class:data-table-row--selected={selected?.id === p.id}
									role="button"
									tabindex="0"
									onclick={() => selectPlace(p)}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											selectPlace(p);
										}
									}}
								>
									{#each activeColumns as col (col.id)}
										<td data-col={col.id}>
											{#if col.id === 'screenshot'}
												<div class="table-shot">
													{#if failedScreenshots[p.id]}
														<span class="table-shot-missing">—</span>
													{:else}
														<img
															src="/api/screenshot/{p.id}"
															alt=""
															class="table-shot-img"
															loading="lazy"
															onerror={() => onImgError(p.id)}
														/>
													{/if}
													<button
														type="button"
														class="table-shot-fs"
														aria-label="View screenshot fullscreen"
														onclick={(e) => {
															e.stopPropagation();
															openScreenshotOverlayFor(p);
														}}
													>
														<svg
															class="table-shot-fs-icon"
															xmlns="http://www.w3.org/2000/svg"
															width="12"
															height="12"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															stroke-width="2"
															stroke-linecap="round"
															stroke-linejoin="round"
															aria-hidden="true"
														>
															<polyline points="15 3 21 3 21 9" />
															<polyline points="9 21 3 21 3 15" />
															<line x1="21" y1="3" x2="14" y2="10" />
															<line x1="3" y1="21" x2="10" y2="14" />
														</svg>
													</button>
												</div>
											{:else if col.id === 'name'}
												<span class="table-cell-strong">{placeTitle(p)}</span>
											{:else if col.id === 'type'}
												{p.primaryTypeDisplayName?.text ?? ''}
											{:else if col.id === 'address'}
												{p.formattedAddress ?? ''}
											{:else if col.id === 'phone'}
												{p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? ''}
											{:else if col.id === 'rating'}
												{ratingLabel(p)}
											{:else if col.id === 'status'}
												{p.businessStatus ?? ''}
											{:else if col.id === 'open_now'}
												{#if openNowValue(p) === true}
													Yes
												{:else if openNowValue(p) === false}
													No
												{:else}
													—
												{/if}
											{:else if col.id === 'hours'}
												<span class="table-cell-clip" title={hoursSummary(p)}>{hoursSummary(p)}</span>
											{:else if col.id === 'website'}
												{#if p.websiteUri}
													<a
														href={p.websiteUri}
														target="_blank"
														rel="noopener noreferrer"
														class="table-link"
														onclick={(e) => e.stopPropagation()}
													>
														Link
													</a>
												{/if}
											{:else if col.id === 'maps'}
												{#if p.googleMapsUri}
													<a
														href={p.googleMapsUri}
														target="_blank"
														rel="noopener noreferrer"
														class="table-link"
														onclick={(e) => e.stopPropagation()}
													>
														Maps
													</a>
												{/if}
											{:else if col.id === 'types'}
												<span
													class="table-cell-clip"
													title={p.types?.join(' · ') ?? ''}
												>
													{typesSummary(p)}
												</span>
											{:else if col.id === 'lat_lng'}
												{placeCoords(p)}
											{:else if col.id === 'plus_code'}
												{plusCodeText(p)}
											{:else if col.id === 'price'}
												{priceLevelText(p)}
											{/if}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<div class="grid">
					{#each data.places as p (p.id)}
						<div
							class="card"
							class:card--selected={selected?.id === p.id}
							role="button"
							tabindex="0"
							onclick={() => selectPlace(p)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									selectPlace(p);
								}
							}}
						>
							<div class="cover">
								{#if crawlPageSummaryLabel(p)}
									<span class="badge badge--crawl" title="Website crawl screenshots">{crawlPageSummaryLabel(p)}</span>
								{/if}
								{#if !hasWebsite(p)}
									<span class="badge badge--no-website">No website</span>
								{/if}
								{#if failedScreenshots[p.id]}
									<div class="cover-placeholder" aria-hidden="true">No screenshot</div>
								{:else}
									<img
										src="/api/screenshot/{p.id}"
										alt=""
										loading="lazy"
										class="cover-img"
										onerror={() => onImgError(p.id)}
									/>
									<button
										type="button"
										class="cover-fs-btn"
										aria-label="View screenshot fullscreen"
										onclick={(e) => {
											e.stopPropagation();
											openScreenshotOverlayFor(p);
										}}
									>
										<svg
											class="cover-fs-icon"
											xmlns="http://www.w3.org/2000/svg"
											width="18"
											height="18"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<polyline points="15 3 21 3 21 9" />
											<polyline points="9 21 3 21 3 15" />
											<line x1="21" y1="3" x2="14" y2="10" />
											<line x1="3" y1="21" x2="10" y2="14" />
										</svg>
									</button>
								{/if}
							</div>
							<div class="card-body">
								<span class="card-title">{placeTitle(p)}</span>
								{#if placeSubtitle(p)}
									<span class="card-sub">{placeSubtitle(p)}</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</main>

		<aside class="panel" aria-label="Business details">
			{#if selected}
				<div class="panel-header">
					<h2 class="panel-title">{placeTitle(selected)}</h2>
					<button type="button" class="close-btn" onclick={closePanel}>Close</button>
				</div>

				<div class="panel-scroll">
					{#if selected.primaryTypeDisplayName?.text}
						<section class="block">
							<h3 class="block-label">Type</h3>
							<p>{selected.primaryTypeDisplayName.text}</p>
						</section>
					{/if}

					{#if selected.businessStatus}
						<section class="block">
							<h3 class="block-label">Status</h3>
							<p>{selected.businessStatus}</p>
						</section>
					{/if}

					{#if selected.rating != null || selected.userRatingCount != null}
						<section class="block">
							<h3 class="block-label">Rating</h3>
							<p>
								{#if selected.rating != null}{selected.rating}★{/if}
								{#if selected.userRatingCount != null}
									<span class="muted"> ({selected.userRatingCount} reviews)</span>
								{/if}
							</p>
						</section>
					{/if}

					{#if selected.formattedAddress}
						<section class="block">
							<h3 class="block-label">Address</h3>
							<p>{selected.formattedAddress}</p>
						</section>
					{/if}

					{#if selected.nationalPhoneNumber || selected.internationalPhoneNumber}
						<section class="block">
							<h3 class="block-label">Phone</h3>
							<p>
								{selected.internationalPhoneNumber ?? selected.nationalPhoneNumber}
							</p>
						</section>
					{/if}

					{#if selected.websiteUri}
						<section class="block">
							<h3 class="block-label">Website</h3>
							<p><a href={selected.websiteUri} target="_blank" rel="noopener noreferrer">{selected.websiteUri}</a></p>
						</section>
					{/if}

					{#if selected.website_crawl}
						{@const crawl = selected.website_crawl}
						{@const crawlPages = crawl.pages ?? []}
						{@const crawlLinks = crawl.discovered_links ?? []}
						<section class="block crawl-block">
							<h3 class="block-label">Website crawl</h3>
							{#if crawl.root?.url_final || crawl.root?.url_requested}
								<p class="crawl-root muted small">
									{#if crawl.root?.url_final}
										<span class="crawl-root-label">Landing</span>
										<a
											href={crawl.root.url_final}
											target="_blank"
											rel="noopener noreferrer"
											class="crawl-root-link"
										>{crawl.root.url_final}</a>
									{:else if crawl.root?.url_requested}
										<span class="crawl-root-label">Requested</span>
										<span>{crawl.root.url_requested}</span>
									{/if}
									{#if crawl.root?.nav_seconds != null}
										<span class="crawl-root-meta"> · {crawl.root.nav_seconds}s to load</span>
									{/if}
								</p>
							{/if}
							<p class="crawl-stats muted small">
								{crawlPages.length} screenshot{crawlPages.length === 1 ? '' : 's'}
								{#if crawlLinks.length}
									· {crawlLinks.length} discovered link{crawlLinks.length === 1 ? '' : 's'}
								{/if}
							</p>
							{#if crawlPages.length}
								<div class="crawl-gallery" role="list">
									{#each crawlPages as pg, i (String(pg.url_final ?? pg.url_requested ?? i))}
										<div class="crawl-card" role="listitem">
											{#if pg.screenshot_path?.trim()}
												<button
													type="button"
													class="crawl-card-thumb"
													onclick={() => openCrawlShot(pg)}
												>
													<img
														src={crawlAssetUrl(pg.screenshot_path.trim())}
														alt=""
														loading="lazy"
														class="crawl-card-img"
													/>
													<span class="crawl-card-depth" aria-hidden="true">d{pg.depth ?? 0}</span>
												</button>
											{:else}
												<div class="crawl-card-missing">
													<span class="crawl-card-error-label">No image</span>
													{#if pg.screenshot_error}
														<span class="crawl-card-error muted small">{pg.screenshot_error}</span>
													{/if}
												</div>
											{/if}
											<div class="crawl-card-meta">
												<span
													class="crawl-card-url"
													title={pg.url_final ?? pg.url_requested ?? ''}
												>{truncateCrawlUrl(pg.url_final ?? pg.url_requested ?? '—')}</span>
												{#if pg.link_count_seen_on_page != null}
													<span class="crawl-card-links-hint muted small"
														>{pg.link_count_seen_on_page} links on page</span
													>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{/if}
							{#if crawlLinks.length}
								<details class="crawl-links-details">
									<summary class="crawl-links-summary"
										>Discovered links ({crawlLinks.length})</summary
									>
									<div class="crawl-links-scroll">
										<ul class="crawl-links-list">
											{#each crawlLinks as L, li (`${L.resolved_url ?? ''}-${li}`)}
												<li class="crawl-link-row">
													<div class="crawl-link-top">
														<span
															class="crawl-link-badge"
															class:crawl-link-badge--in={L.is_internal === true}
															class:crawl-link-badge--out={L.is_internal !== true}
															>{L.is_internal === true ? 'In' : 'Out'}</span
														>
														<span class="crawl-link-tag">{L.tag ?? '—'}</span>
													</div>
													{#if L.resolved_url}
														<a
															href={L.resolved_url}
															target="_blank"
															rel="noopener noreferrer"
															class="crawl-link-href"
															>{truncateCrawlUrl(L.resolved_url, 72)}</a
														>
													{/if}
													{#if L.text}
														<span class="crawl-link-text muted small" title={L.text}
															>{truncateCrawlUrl(L.text, 48)}</span
														>
													{/if}
												</li>
											{/each}
										</ul>
									</div>
								</details>
							{/if}
						</section>
					{/if}

					{#if selected.googleMapsUri}
						<section class="block">
							<h3 class="block-label">Google Maps</h3>
							<p><a href={selected.googleMapsUri} target="_blank" rel="noopener noreferrer">Open in Maps</a></p>
						</section>
					{/if}

					{#if selected.types?.length}
						<section class="block">
							<h3 class="block-label">Categories</h3>
							<p class="tags">{selected.types.join(', ')}</p>
						</section>
					{/if}

					{#if hoursLines(selected).length}
						<section class="block">
							<h3 class="block-label">Hours</h3>
							<ul class="hours">
								{#each hoursLines(selected) as line}
									<li>{line}</li>
								{/each}
							</ul>
							{#if selected.regularOpeningHours?.openNow != null}
								<p class="muted small">
									{selected.regularOpeningHours.openNow ? 'Open now' : 'Closed now'} (regular hours)
								</p>
							{/if}
						</section>
					{/if}

					{#if selected.reviews?.length}
						<section class="block">
							<h3 class="block-label">Recent reviews</h3>
							<ul class="reviews">
								{#each selected.reviews.slice(0, 5) as r}
									<li class="review">
										{#if r.rating != null}<span class="review-rating">{r.rating}★</span>{/if}
										{#if r.text?.text}<q class="review-text">{r.text.text}</q>{/if}
										{#if r.relativePublishTimeDescription}
											<span class="muted small">{r.relativePublishTimeDescription}</span>
										{/if}
									</li>
								{/each}
							</ul>
						</section>
					{/if}

					<details class="raw">
						<summary>Full JSON record</summary>
						<pre class="json">{JSON.stringify(selected, null, 2)}</pre>
					</details>
				</div>
			{:else}
				<div class="panel-empty">
					<p>Select a business to see details.</p>
				</div>
			{/if}
		</aside>
	</div>

	{#if screenshotOverlayOpen && selected}
		<div
			class="shot-overlay"
			role="dialog"
			aria-modal="true"
			aria-label="Screenshot fullscreen"
			tabindex="-1"
			onclick={closeScreenshotOverlay}
			onkeydown={(e) => {
				if (e.currentTarget !== e.target) return;
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					closeScreenshotOverlay();
				}
			}}
		>
			<div
				class="shot-overlay-toolbar"
				onclick={(e) => e.stopPropagation()}
				role="presentation"
			>
				<div class="shot-overlay-titles">
					<span class="shot-overlay-primary">{overlayCaption ?? placeTitle(selected)}</span>
					{#if overlayCaption}
						<span class="shot-overlay-secondary">{placeTitle(selected)}</span>
					{/if}
				</div>
				<button type="button" class="shot-overlay-close" onclick={closeScreenshotOverlay}>
					Close
				</button>
			</div>
			<div class="shot-overlay-stage" role="presentation">
				<img
					src={overlayImageSrc ?? `/api/screenshot/${selected.id}`}
					alt={overlayCaption
						? `Screenshot: ${overlayCaption}`
						: `Screenshot of ${placeTitle(selected)}`}
					class="shot-overlay-img"
					onclick={(e) => e.stopPropagation()}
				/>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		background: #0f1216;
		color: #e8eaed;
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			Roboto,
			sans-serif;
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.header {
		border-bottom: 1px solid #2d333b;
		background: #161b22;
		flex-shrink: 0;
	}

	.header-inner {
		padding: 1rem 1.25rem;
		max-width: 100%;
	}

	.header h1 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.meta {
		margin: 0.35rem 0 0;
		font-size: 0.875rem;
		color: #8b949e;
	}

	.meta-sep {
		margin: 0 0.35rem;
	}

	.header-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1rem;
		margin-top: 0.85rem;
	}

	.view-toggle {
		display: inline-flex;
		border: 1px solid #484f58;
		border-radius: 8px;
		overflow: hidden;
		background: #21262d;
	}

	.view-toggle-btn {
		margin: 0;
		padding: 0.4rem 0.75rem;
		font-size: 0.8rem;
		border: none;
		border-right: 1px solid #484f58;
		background: transparent;
		color: #c9d1d9;
		cursor: pointer;
		line-height: 1.2;
	}

	.view-toggle-btn:last-child {
		border-right: none;
	}

	.view-toggle-btn:hover {
		background: #30363d;
		color: #e8eaed;
	}

	.view-toggle-btn--active {
		background: #388bfd33;
		color: #58a6ff;
		font-weight: 600;
	}

	.cols-dropdown {
		position: relative;
	}

	.cols-dropdown-summary {
		list-style: none;
		cursor: pointer;
		font-size: 0.8rem;
		padding: 0.4rem 0.75rem;
		border-radius: 8px;
		border: 1px solid #484f58;
		background: #21262d;
		color: #e8eaed;
		user-select: none;
	}

	.cols-dropdown-summary::-webkit-details-marker {
		display: none;
	}

	.cols-dropdown-summary::after {
		content: ' ▾';
		font-size: 0.7rem;
		opacity: 0.8;
	}

	.cols-dropdown-panel {
		position: absolute;
		left: 0;
		top: calc(100% + 4px);
		z-index: 50;
		min-width: 220px;
		max-height: min(70vh, 420px);
		overflow: auto;
		padding: 0.5rem 0.65rem;
		border-radius: 8px;
		border: 1px solid #484f58;
		background: #21262d;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
	}

	.cols-dropdown-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 0.75rem;
		padding-bottom: 0.45rem;
		margin-bottom: 0.45rem;
		border-bottom: 1px solid #30363d;
	}

	.linkish {
		padding: 0;
		border: none;
		background: none;
		color: #58a6ff;
		font-size: 0.78rem;
		cursor: pointer;
		text-decoration: underline;
	}

	.linkish:hover {
		color: #79b8ff;
	}

	.cols-check-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.cols-check {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.8rem;
		color: #c9d1d9;
		cursor: pointer;
	}

	.cols-check input {
		flex-shrink: 0;
	}

	.body {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	@media (min-width: 900px) {
		.body {
			flex-direction: row;
		}
	}

	.main {
		flex: 1;
		min-width: 0;
		overflow: auto;
		padding: 1rem 1.25rem 2rem;
	}

	.main--big-grid .grid {
		grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
		gap: 1.15rem;
	}

	.main--big-grid .cover {
		height: clamp(11rem, 36vw, 20rem);
		max-height: 20rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 1rem;
		align-content: start;
	}

	.card {
		display: flex;
		flex-direction: column;
		text-align: left;
		padding: 0;
		border: 1px solid #2d333b;
		border-radius: 10px;
		background: #161b22;
		cursor: pointer;
		overflow: hidden;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
		outline: none;
	}

	.card:hover {
		border-color: #484f58;
	}

	.card:focus-visible {
		outline: 2px solid #58a6ff;
		outline-offset: 2px;
	}

	.card--selected {
		border-color: #58a6ff;
		box-shadow: 0 0 0 1px #58a6ff;
	}

	.cover {
		width: 100%;
		height: clamp(6rem, 24vw, 12rem);
		max-height: 12rem;
		background: #21262d;
		position: relative;
		overflow: hidden;
		flex-shrink: 0;
	}

	.cover-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top center;
		display: block;
	}

	.cover-fs-btn {
		position: absolute;
		right: 0.35rem;
		bottom: 0.35rem;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: none;
		border-radius: 8px;
		background: rgba(15, 18, 22, 0.82);
		color: #e8eaed;
		cursor: pointer;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
		opacity: 0;
		pointer-events: none;
		transition:
			opacity 0.15s ease,
			background 0.15s ease,
			transform 0.15s ease;
	}

	.cover:hover .cover-fs-btn,
	.cover:focus-within .cover-fs-btn {
		opacity: 1;
		pointer-events: auto;
	}

	.cover-fs-btn:hover {
		background: rgba(56, 139, 253, 0.35);
		color: #fff;
	}

	.cover-fs-btn:focus-visible {
		opacity: 1;
		pointer-events: auto;
		outline: 2px solid #58a6ff;
		outline-offset: 2px;
	}

	.cover-fs-icon {
		display: block;
	}

	.badge {
		position: absolute;
		top: 0.4rem;
		right: 0.4rem;
		z-index: 1;
		font-size: 0.62rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.2rem 0.45rem;
		border-radius: 4px;
		line-height: 1.2;
		pointer-events: none;
	}

	.badge--no-website {
		background: rgba(154, 103, 0, 0.92);
		color: #fff;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
	}

	.badge--crawl {
		left: 0.4rem;
		right: auto;
		text-transform: none;
		font-weight: 600;
		font-size: 0.65rem;
		letter-spacing: 0.02em;
		background: rgba(56, 139, 253, 0.88);
		color: #fff;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
	}

	.cover-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		font-size: 0.8rem;
		color: #6e7681;
	}

	.card-body {
		padding: 0.75rem 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.card-title {
		font-weight: 600;
		font-size: 0.95rem;
		line-height: 1.3;
		color: #e8eaed;
	}

	.card-sub {
		font-size: 0.8rem;
		color: #8b949e;
		line-height: 1.35;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.panel {
		flex-shrink: 0;
		width: 100%;
		max-height: 45vh;
		border-top: 1px solid #2d333b;
		background: #161b22;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	@media (min-width: 900px) {
		.panel {
			width: min(420px, 40vw);
			max-height: none;
			border-top: none;
			border-left: 1px solid #2d333b;
		}
	}

	.panel-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid #2d333b;
		flex-shrink: 0;
	}

	.panel-title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
		line-height: 1.35;
	}

	.close-btn {
		flex-shrink: 0;
		padding: 0.35rem 0.65rem;
		font-size: 0.8rem;
		border-radius: 6px;
		border: 1px solid #484f58;
		background: #21262d;
		color: #e8eaed;
		cursor: pointer;
	}

	.close-btn:hover {
		background: #30363d;
	}

	.panel-scroll {
		overflow: auto;
		padding: 1rem 1.25rem 1.5rem;
		flex: 1;
		min-height: 0;
	}

	.panel-empty {
		padding: 2rem 1.25rem;
		color: #8b949e;
		font-size: 0.95rem;
	}

	.block {
		margin-bottom: 1.25rem;
	}

	.block-label {
		margin: 0 0 0.35rem;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #8b949e;
	}

	.block p {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.5;
		word-break: break-word;
	}

	.block a {
		color: #58a6ff;
	}

	.muted {
		color: #8b949e;
	}

	.small {
		font-size: 0.8rem;
	}

	.tags {
		font-size: 0.85rem;
	}

	.hours {
		margin: 0;
		padding-left: 1.1rem;
		font-size: 0.88rem;
		line-height: 1.55;
	}

	.reviews {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.review {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.88rem;
	}

	.review-rating {
		font-weight: 600;
		color: #d29922;
	}

	.review-text {
		font-style: normal;
		quotes: none;
		color: #c9d1d9;
	}

	.raw {
		margin-top: 0.5rem;
		border-radius: 8px;
		border: 1px solid #2d333b;
		padding: 0.65rem 0.85rem;
		background: #0d1117;
	}

	.raw summary {
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		color: #58a6ff;
	}

	.json {
		margin: 0.75rem 0 0;
		padding: 0;
		font-size: 0.68rem;
		line-height: 1.45;
		overflow: auto;
		max-height: 320px;
		white-space: pre-wrap;
		word-break: break-all;
		color: #8b949e;
	}

	.shot-overlay {
		position: fixed;
		inset: 0;
		z-index: 10000;
		display: flex;
		flex-direction: column;
		background: rgba(0, 0, 0, 0.88);
		cursor: zoom-out;
	}

	.shot-overlay-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-shrink: 0;
		padding: 0.65rem 1rem;
		background: rgba(15, 18, 22, 0.95);
		border-bottom: 1px solid #30363d;
		cursor: default;
	}

	.shot-overlay-titles {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
		flex: 1;
	}

	.shot-overlay-primary {
		font-size: 0.9rem;
		font-weight: 600;
		color: #e8eaed;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.shot-overlay-secondary {
		font-size: 0.78rem;
		font-weight: 500;
		color: #8b949e;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.shot-overlay-close {
		flex-shrink: 0;
		padding: 0.4rem 0.85rem;
		font-size: 0.85rem;
		border-radius: 6px;
		border: 1px solid #484f58;
		background: #21262d;
		color: #e8eaed;
		cursor: pointer;
	}

	.shot-overlay-close:hover {
		background: #30363d;
	}

	.shot-overlay-stage {
		flex: 1;
		min-height: 0;
		overflow: auto;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: 0.75rem;
		cursor: default;
	}

	.shot-overlay-img {
		width: min(90vw, 1400px);
		max-width: none;
		height: auto;
		display: block;
		flex-shrink: 0;
		border-radius: 4px;
		box-shadow: 0 8px 48px rgba(0, 0, 0, 0.6);
	}

	.table-scroll {
		overflow-x: auto;
		margin: 0 -0.25rem;
		padding: 0 0.25rem;
	}

	.data-table {
		width: max-content;
		min-width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
		line-height: 1.4;
		color: #c9d1d9;
	}

	.data-table thead th {
		position: sticky;
		top: 0;
		z-index: 1;
		text-align: left;
		font-weight: 600;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #8b949e;
		background: #161b22;
		border-bottom: 1px solid #30363d;
		padding: 0.55rem 0.75rem;
		white-space: nowrap;
	}

	.data-table tbody td {
		border-bottom: 1px solid #2d333b;
		padding: 0.45rem 0.75rem;
		vertical-align: middle;
		max-width: 18rem;
	}

	.data-table tbody tr {
		cursor: pointer;
		transition: background 0.12s ease;
	}

	.data-table tbody tr:nth-child(even) {
		background: #141920;
	}

	.data-table tbody tr:hover {
		background: #1c2128;
	}

	.data-table-row--selected {
		box-shadow: inset 0 0 0 1px #58a6ff;
		background: #388bfd18 !important;
	}

	.data-table-row--selected:hover {
		background: #388bfd24 !important;
	}

	.table-cell-strong {
		font-weight: 600;
		color: #e8eaed;
	}

	.table-cell-clip {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		word-break: break-word;
	}

	.table-link {
		color: #58a6ff;
		text-decoration: none;
		font-weight: 500;
	}

	.table-link:hover {
		text-decoration: underline;
	}

	.table-shot {
		position: relative;
		width: 4.5rem;
		height: 3rem;
		border-radius: 6px;
		overflow: hidden;
		background: #21262d;
	}

	.table-shot-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top center;
		display: block;
	}

	.table-shot-missing {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		font-size: 0.75rem;
		color: #6e7681;
	}

	.table-shot-fs {
		position: absolute;
		right: 2px;
		bottom: 2px;
		width: 1.35rem;
		height: 1.35rem;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 4px;
		background: rgba(15, 18, 22, 0.85);
		color: #e8eaed;
		cursor: pointer;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.12s ease;
	}

	.table-shot-fs-icon {
		display: block;
	}

	.table-shot:hover .table-shot-fs,
	.table-shot:focus-within .table-shot-fs {
		opacity: 1;
		pointer-events: auto;
	}

	.table-shot-fs:hover {
		background: rgba(56, 139, 253, 0.4);
	}

	.crawl-block .crawl-root {
		margin: 0 0 0.5rem;
		line-height: 1.45;
	}

	.crawl-root-label {
		font-weight: 600;
		color: #8b949e;
		margin-right: 0.35rem;
	}

	.crawl-root-link {
		color: #58a6ff;
		word-break: break-all;
	}

	.crawl-stats {
		margin: 0 0 0.75rem;
	}

	.crawl-gallery {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
		gap: 0.65rem;
		margin-bottom: 0.75rem;
	}

	.crawl-card {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
	}

	.crawl-card-thumb {
		position: relative;
		display: block;
		width: 100%;
		padding: 0;
		border: 1px solid #30363d;
		border-radius: 8px;
		overflow: hidden;
		background: #0d1117;
		cursor: zoom-in;
		transition:
			border-color 0.12s ease,
			box-shadow 0.12s ease;
	}

	.crawl-card-thumb:hover {
		border-color: #58a6ff;
		box-shadow: 0 0 0 1px #388bfd66;
	}

	.crawl-card-img {
		width: 100%;
		aspect-ratio: 16 / 10;
		object-fit: cover;
		object-position: top center;
		display: block;
	}

	.crawl-card-depth {
		position: absolute;
		top: 0.35rem;
		left: 0.35rem;
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0.15rem 0.35rem;
		border-radius: 4px;
		background: rgba(15, 18, 22, 0.88);
		color: #8b949e;
	}

	.crawl-card-missing {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		min-height: 4.5rem;
		padding: 0.5rem;
		border: 1px dashed #484f58;
		border-radius: 8px;
		background: #0d1117;
		text-align: center;
	}

	.crawl-card-error-label {
		font-size: 0.72rem;
		font-weight: 600;
		color: #8b949e;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.crawl-card-error {
		font-size: 0.68rem;
		line-height: 1.35;
		word-break: break-word;
	}

	.crawl-card-meta {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	.crawl-card-url {
		font-size: 0.72rem;
		line-height: 1.35;
		color: #c9d1d9;
		word-break: break-all;
	}

	.crawl-card-links-hint {
		font-size: 0.68rem;
	}

	.crawl-links-details {
		margin-top: 0.25rem;
		border-radius: 8px;
		border: 1px solid #2d333b;
		background: #0d1117;
		overflow: hidden;
	}

	.crawl-links-summary {
		cursor: pointer;
		padding: 0.55rem 0.75rem;
		font-size: 0.85rem;
		font-weight: 500;
		color: #58a6ff;
		list-style: none;
	}

	.crawl-links-summary::-webkit-details-marker {
		display: none;
	}

	.crawl-links-scroll {
		max-height: 220px;
		overflow: auto;
		border-top: 1px solid #2d333b;
	}

	.crawl-links-list {
		list-style: none;
		margin: 0;
		padding: 0.35rem 0;
	}

	.crawl-link-row {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.45rem 0.75rem;
		font-size: 0.78rem;
		border-bottom: 1px solid #21262d;
	}

	.crawl-link-row:last-child {
		border-bottom: none;
	}

	.crawl-link-row:hover {
		background: #161b22;
	}

	.crawl-link-top {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.crawl-link-badge {
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		padding: 0.12rem 0.3rem;
		border-radius: 3px;
		flex-shrink: 0;
	}

	.crawl-link-badge--in {
		background: rgba(46, 160, 67, 0.25);
		color: #3fb950;
	}

	.crawl-link-badge--out {
		background: rgba(110, 118, 129, 0.35);
		color: #8b949e;
	}

	.crawl-link-tag {
		font-size: 0.65rem;
		color: #6e7681;
		text-transform: lowercase;
		flex-shrink: 0;
	}

	.crawl-link-href {
		color: #58a6ff;
		word-break: break-all;
		min-width: 0;
		line-height: 1.35;
	}

	.crawl-link-text {
		font-size: 0.72rem;
		line-height: 1.35;
	}
</style>
