<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
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
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Slider } from '$lib/components/ui/slider/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import 'leaflet/dist/leaflet.css';
	import type { Circle, Map as LeafletMap, Marker } from 'leaflet';

	const SORO_LAT = 55.4318;
	const SORO_LNG = 11.5555;
	const MAX_FETCH_COUNT = 100;

	let pickLat = $state(SORO_LAT);
	let pickLng = $state(SORO_LNG);
	let radiusM = $state(25_000);
	let textQuery = $state('businesses');
	let rankByDistance = $state(true);
	let regionCode = $state('DK');
	let languageCode = $state('da');
	let count = $state(10);
	let outputPath = $state('maps_businesses.json');
	let csvOutput = $state('');
	let noCsv = $state(false);
	let fieldMask = $state('*');

	let mapContainer: HTMLDivElement | undefined = $state();
	let leafletLayer = $state<{
		map: LeafletMap;
		marker: Marker;
		circle: Circle;
	} | null>(null);

	let logLines = $state<string[]>([]);
	let running = $state(false);
	let runError = $state<string | null>(null);
	let currentRunId = $state<string | null>(null);
	let runController = $state<AbortController | null>(null);

	function pushLog(line: string) {
		logLines = [...logLines, line];
	}

	function resetRunState() {
		runError = null;
		currentRunId = null;
		logLines = [];
	}

	function formatRadiusMeters(m: number): string {
		if (!Number.isFinite(m)) return '—';
		if (m >= 1000) {
			const km = m / 1000;
			const digits = km >= 10 || m % 1000 === 0 ? 0 : 1;
			return `${km.toFixed(digits)} km`;
		}
		return `${Math.round(m)} m`;
	}

	function canStart(): { ok: true } | { ok: false; reason: string } {
		if (running) return { ok: false, reason: 'A fetch is already in progress' };
		if (!textQuery.trim()) return { ok: false, reason: 'Search query is required' };
		if (!Number.isFinite(pickLat) || !Number.isFinite(pickLng)) {
			return { ok: false, reason: 'Latitude and longitude must be valid numbers' };
		}
		if (pickLat < -90 || pickLat > 90 || pickLng < -180 || pickLng > 180) {
			return { ok: false, reason: 'Latitude / longitude out of range' };
		}
		if (radiusM < 50 || radiusM > 100_000) {
			return { ok: false, reason: 'Radius must be between 50 m and 100 km' };
		}
		if (!Number.isInteger(count) || count < 1 || count > MAX_FETCH_COUNT) {
			return { ok: false, reason: `Count must be an integer from 1 to ${MAX_FETCH_COUNT}` };
		}
		if (!outputPath.trim()) return { ok: false, reason: 'Output JSON path is required' };
		return { ok: true };
	}

	function handleEventPayload(evt: { type?: string } & Record<string, unknown>) {
		const type = evt.type;
		if (type === 'connected') {
			currentRunId = String(evt.runId ?? '');
			pushLog(`Connected · run ${currentRunId}`);
		} else if (type === 'fetch_started') {
			pushLog(
				`Fetch started: query=${String(evt.query ?? '')} · center=${Number(evt.lat).toFixed(5)},${Number(evt.lng).toFixed(5)} · radius ${evt.radius_m}m · n=${evt.count}`
			);
		} else if (type === 'fetch_api_ok') {
			pushLog(`Places API returned ${evt.returned_count} result(s)`);
		} else if (type === 'fetch_saved') {
			pushLog(
				`Saved JSON: +${evt.added_count} new, ${evt.skipped_existing_count} skipped (already in file), total ${evt.total_places}`
			);
		} else if (type === 'fetch_csv_saved') {
			pushLog(`CSV: ${evt.rows} row(s) → ${evt.path}`);
		} else if (type === 'fetch_finished') {
			pushLog('Fetch finished successfully');
		} else if (type === 'fetch_error') {
			const msg = String(evt.message ?? 'Unknown error');
			runError = msg;
			pushLog(`ERROR: ${msg}`);
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
		} else if (type) {
			pushLog(`[${type}] ${JSON.stringify(evt)}`);
		}
	}

	async function startFetch() {
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
				query: textQuery.trim(),
				lat: pickLat,
				lng: pickLng,
				radiusM,
				rankByDistance,
				regionCode: regionCode.trim() || 'DK',
				languageCode: languageCode.trim() || 'da',
				count,
				output: outputPath.trim(),
				noCsv,
				fieldMask: fieldMask.trim() || '*'
			};
			if (!noCsv && csvOutput.trim()) {
				body.csvOutput = csvOutput.trim();
			}
			const res = await fetch('/api/leads/fetch/run', {
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
		}
	}

	function cancelFetch() {
		runController?.abort();
	}

	onMount(() => {
		if (!browser || !mapContainer) return;

		let cancelled = false;

		void (async () => {
			const L = await import('leaflet');
			if (cancelled || !mapContainer) return;

			const map = L.map(mapContainer).setView([pickLat, pickLng], 11);
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
			}).addTo(map);

			const pinIcon = L.divIcon({
				className: 'lead-fetch-map-pin',
				iconSize: [22, 22],
				iconAnchor: [11, 11]
			});

			const marker = L.marker([pickLat, pickLng], { draggable: true, icon: pinIcon }).addTo(
				map
			);
			const circle = L.circle([pickLat, pickLng], {
				radius: radiusM,
				color: '#3b82f6',
				weight: 2,
				fillOpacity: 0.12
			}).addTo(map);

			marker.on('dragend', () => {
				const ll = marker.getLatLng();
				pickLat = ll.lat;
				pickLng = ll.lng;
				circle.setLatLng(ll);
			});

			map.on('click', (e) => {
				marker.setLatLng(e.latlng);
				circle.setLatLng(e.latlng);
				pickLat = e.latlng.lat;
				pickLng = e.latlng.lng;
			});

			if (cancelled) {
				map.remove();
				return;
			}
			leafletLayer = { map, marker, circle };
		})();

		return () => {
			cancelled = true;
			const layer = leafletLayer;
			leafletLayer = null;
			layer?.map.remove();
		};
	});

	$effect(() => {
		const layer = leafletLayer;
		if (!layer) return;
		layer.marker.setLatLng([pickLat, pickLng]);
		layer.circle.setLatLng([pickLat, pickLng]);
		layer.circle.setRadius(radiusM);
	});
</script>

<svelte:head>
	<title>Find new leads</title>
</svelte:head>

<div class="bg-background text-foreground flex min-h-screen flex-col">
	<header class="bg-card border-border flex shrink-0 flex-col border-b">
		<div class="max-w-full px-5 py-4">
			<h1 class="text-xl leading-none font-semibold tracking-tight">Find new leads</h1>
			<p class="text-muted-foreground mt-1.5 text-sm">
				Run <code class="text-[0.8rem]">fetch_businesses.py</code> against Google Places (Text Search)
				with a map-based search center and bias radius. New place IDs are merged into your JSON; existing
				IDs are skipped. Uses <code class="text-[0.8rem]">GOOGLE_MAPS_API_KEY</code> from the fetcher
				<code class="text-[0.8rem]">.env.local</code>.
			</p>
		</div>
	</header>

	<div class="grid min-h-0 flex-1 grid-cols-1 gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
		<div class="flex min-w-0 flex-col gap-5">
			<Card>
				<CardHeader>
					<CardTitle>Search area</CardTitle>
					<CardDescription>
						Click the map or drag the pin to set the bias center. The circle is the search radius
						used when &ldquo;Rank by distance&rdquo; is on (Places API
						<code class="text-[0.75rem]">locationBias</code>).
					</CardDescription>
				</CardHeader>
				<CardContent class="flex flex-col gap-4">
					<div
						bind:this={mapContainer}
						class="border-border bg-muted/30 h-[min(420px,50vh)] w-full overflow-hidden rounded-lg border"
						role="application"
						aria-label="Map: click to set search center"
					></div>
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="flex flex-col gap-2">
							<Label for="lat">Latitude</Label>
							<Input id="lat" type="number" step="any" bind:value={pickLat} class="font-mono text-sm" />
						</div>
						<div class="flex flex-col gap-2">
							<Label for="lng">Longitude</Label>
							<Input id="lng" type="number" step="any" bind:value={pickLng} class="font-mono text-sm" />
						</div>
					</div>
					<div class="flex flex-col gap-3">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<Label id="radius-label" for="radius-slider">Bias radius</Label>
							<Badge variant="secondary" class="font-mono text-xs font-normal tabular-nums">
								{formatRadiusMeters(radiusM)} · {Math.round(radiusM)} m
							</Badge>
						</div>
						<Slider
							id="radius-slider"
							type="single"
							bind:value={radiusM}
							min={50}
							max={100_000}
							step={500}
							aria-labelledby="radius-label"
						/>
						<div class="flex flex-col gap-2">
							<Label for="radius" class="sr-only">Bias radius (exact meters)</Label>
							<Input
								id="radius"
								type="number"
								min={50}
								max={100000}
								step={100}
								bind:value={radiusM}
								class="font-mono text-sm"
							/>
						</div>
						<p class="text-muted-foreground text-xs">Typical: 5_000–50_000 for a town or region.</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Places API parameters</CardTitle>
					<CardDescription>Matches CLI flags for <code class="text-[0.75rem]">fetch_businesses.py</code>.</CardDescription>
				</CardHeader>
				<CardContent class="flex flex-col gap-4">
					<div class="flex flex-col gap-2">
						<Label for="query">Text query</Label>
						<Input
							id="query"
							type="text"
							bind:value={textQuery}
							placeholder="e.g. coffee shops, restaurants"
							class="text-sm"
						/>
					</div>
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="flex flex-col gap-3">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<Label id="count-label" for="count-slider">Result count</Label>
								<Badge variant="secondary" class="font-mono text-xs font-normal tabular-nums">
									{count} / {MAX_FETCH_COUNT}
								</Badge>
							</div>
							<Slider
								id="count-slider"
								type="single"
								bind:value={count}
								min={1}
								max={MAX_FETCH_COUNT}
								step={1}
								aria-labelledby="count-label"
							/>
							<div class="flex flex-col gap-2">
								<Label for="count" class="sr-only">Result count (numeric)</Label>
								<Input
									id="count"
									type="number"
									min={1}
									max={MAX_FETCH_COUNT}
									step={1}
									bind:value={count}
								/>
							</div>
						</div>
						<div class="flex flex-col gap-2">
							<Label for="field-mask">Field mask</Label>
							<Input
								id="field-mask"
								type="text"
								bind:value={fieldMask}
								class="font-mono text-sm"
								placeholder="*"
							/>
						</div>
					</div>
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="flex flex-col gap-2">
							<Label for="region">Region code</Label>
							<Input
								id="region"
								type="text"
								bind:value={regionCode}
								class="font-mono text-sm"
								maxlength={6}
							/>
						</div>
						<div class="flex flex-col gap-2">
							<Label for="language">Language code</Label>
							<Input
								id="language"
								type="text"
								bind:value={languageCode}
								class="font-mono text-sm"
								maxlength={16}
							/>
						</div>
					</div>
					<label class="flex cursor-pointer items-center gap-2 text-sm">
						<Checkbox bind:checked={rankByDistance} />
						<span>Rank by distance (location bias + <code class="text-[0.75rem]">DISTANCE</code>)</span>
					</label>
					<Separator />
					<div class="flex flex-col gap-2">
						<Label for="output">Output JSON (repo-relative)</Label>
						<Input id="output" type="text" bind:value={outputPath} class="font-mono text-sm" />
					</div>
					<label class="flex cursor-pointer items-center gap-2 text-sm">
						<Checkbox bind:checked={noCsv} />
						<span>Do not write CSV (<code class="text-[0.75rem]">--no-csv</code>)</span>
					</label>
					<div class="flex flex-col gap-2">
						<Label for="csv-out">Custom CSV path (optional)</Label>
						<Input
							id="csv-out"
							type="text"
							bind:value={csvOutput}
							class="font-mono text-sm"
							disabled={noCsv}
							placeholder="Default: same basename as JSON → .csv"
						/>
					</div>
					<p class="text-muted-foreground text-xs">
						CLI equivalent:
						<code class="text-[0.7rem] break-all"
							>uv run fetch_businesses.py -q &quot;{textQuery || '…'}&quot; --lat {pickLat} --lng {pickLng}
							--radius-m {radiusM}{rankByDistance ? '' : ' --no-distance-rank'} --region-code {regionCode || 'DK'}
							--language-code {languageCode || 'da'} -n {count} -o {outputPath || 'maps_businesses.json'}{noCsv ? ' --no-csv' : ''}</code
						>
					</p>
				</CardContent>
			</Card>
		</div>

		<div class="flex min-h-0 min-w-0 flex-col gap-4">
			<Card class="flex min-h-0 flex-1 flex-col">
				<CardHeader class="shrink-0 pb-2">
					<CardTitle class="text-base">Run</CardTitle>
					<CardDescription>Streams stdout/stderr from the Python process (SSE).</CardDescription>
				</CardHeader>
				<CardContent class="flex min-h-0 flex-1 flex-col gap-3">
					{#if runError}
						<Alert variant="destructive">
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>{runError}</AlertDescription>
						</Alert>
					{/if}
					<div class="flex flex-wrap gap-2">
						<Button onclick={startFetch} disabled={running}> {running ? 'Fetching…' : 'Fetch leads'} </Button>
						<Button variant="outline" onclick={cancelFetch} disabled={!running}>Cancel</Button>
						<Button variant="secondary" onclick={() => void goto('/leadoverview')}>
							Open lead overview
						</Button>
					</div>
					<ScrollArea class="border-border bg-muted/20 h-[min(520px,45vh)] rounded-md border p-3 font-mono text-xs whitespace-pre-wrap xl:h-[min(70vh,640px)]">
						{#if logLines.length === 0}
							<span class="text-muted-foreground">Log output will appear here.</span>
						{:else}
							{#each logLines as line, i (i)}
								<div>{line}</div>
							{/each}
						{/if}
					</ScrollArea>
				</CardContent>
			</Card>
		</div>
	</div>
</div>

<style>
	:global(.lead-fetch-map-pin) {
		background: var(--primary);
		border: 2px solid var(--background);
		border-radius: 50%;
		box-shadow: 0 2px 10px rgb(0 0 0 / 35%);
	}
</style>
