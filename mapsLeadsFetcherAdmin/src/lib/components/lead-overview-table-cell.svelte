<script lang="ts">
	import type { Place } from '$lib/places.types';
	import type { TableColumnId } from '$lib/leadoverviewTableColumns';
	import { placeTitle, ratingLabel } from '$lib/places';
	import { Button } from '$lib/components/ui/button/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowExpandDiagonal01Icon } from '@hugeicons/core-free-icons';
	import { cn } from '$lib/utils.js';

	let {
		place: p,
		colId,
		failedScreenshot,
		leadRating,
		onImgError,
		onExpandScreenshot,
		setRating
	}: {
		place: Place;
		colId: TableColumnId;
		failedScreenshot: boolean;
		leadRating?: number;
		onImgError: () => void;
		onExpandScreenshot: () => void;
		setRating?: (value: number | null) => void;
	} = $props();

	/** Strong orange/amber at 1 → strong green at 10 (readable contrast). */
	function scoreHeatStyle(score: number | undefined): string | undefined {
		if (score == null || Number.isNaN(score)) return undefined;
		const n = Math.min(10, Math.max(1, Math.round(score)));
		const t = (n - 1) / 9;
		const h = 28 + t * 96;
		const s = 92 - t * 10;
		const l = 34 + t * 14;
		const edge = Math.max(l - 16, 22);
		return `background-color: hsl(${h} ${s}% ${l}%); color: rgb(250 250 250); box-shadow: inset 0 0 0 1px hsl(${h} ${Math.min(s + 6, 98)}% ${edge}%);`;
	}

	function openNowValue(place: Place): boolean | undefined {
		const reg = place.regularOpeningHours?.openNow;
		const cur = place.currentOpeningHours?.openNow;
		if (reg !== undefined) return reg;
		return cur;
	}

	function hoursLines(place: Place): string[] {
		const w =
			place.regularOpeningHours?.weekdayDescriptions ??
			place.currentOpeningHours?.weekdayDescriptions;
		return w ?? [];
	}

	function hoursSummary(place: Place): string {
		return hoursLines(place).join('; ');
	}

	function typesSummary(place: Place, maxLen = 72): string {
		const t = place.types?.join(' · ') ?? '';
		if (t.length <= maxLen) return t;
		return `${t.slice(0, maxLen - 1)}…`;
	}

	function placeCoords(place: Place): string {
		const loc = place.location;
		if (loc?.latitude != null && loc?.longitude != null) {
			return `${loc.latitude}, ${loc.longitude}`;
		}
		return '';
	}

	function plusCodeText(place: Place): string {
		return place.plusCode?.globalCode ?? place.plusCode?.compoundCode ?? '';
	}

	function priceLevelText(place: Place): string {
		return typeof place.priceLevel === 'string' ? place.priceLevel : '';
	}

	function formatAdded(iso: string): string {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return iso;
		return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
	}
</script>

{#if colId === 'screenshot'}
	<div class="group/table-shot relative size-[4.5rem] overflow-hidden rounded-md bg-muted">
		{#if failedScreenshot}
			<span class="text-muted-foreground flex h-full items-center justify-center text-xs">—</span>
		{:else}
			<img
				src="/api/screenshot/{p.id}"
				alt=""
				class="size-full object-cover object-top"
				loading="lazy"
				onerror={onImgError}
			/>
		{/if}
		<Button
			type="button"
			variant="secondary"
			size="icon-xs"
			class="absolute right-0.5 bottom-0.5 opacity-0 transition-opacity group-hover/table-shot:opacity-100 focus-visible:opacity-100"
			aria-label="View screenshot fullscreen"
			onclick={(e) => {
				e.stopPropagation();
				onExpandScreenshot();
			}}
		>
			<HugeiconsIcon icon={ArrowExpandDiagonal01Icon} strokeWidth={2} />
		</Button>
	</div>
{:else if colId === 'interested'}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="flex justify-center px-0.5" onclick={(e) => e.stopPropagation()}>
		<input
			type="number"
			min="1"
			max="10"
			step="1"
			inputmode="numeric"
			aria-label="Your score from 1 to 10"
			data-slot="input"
			class={cn(
				'size-8 shrink-0 rounded-lg border p-0 text-center text-sm font-semibold tabular-nums outline-none transition-[background-color,box-shadow,color,border-color]',
				'[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
				'focus-visible:ring-2 focus-visible:ring-ring/55',
				leadRating == null || Number.isNaN(leadRating)
					? 'bg-muted/60 border-border text-foreground'
					: 'border-transparent'
			)}
			style={scoreHeatStyle(leadRating)}
			value={leadRating != null && !Number.isNaN(leadRating) ? String(leadRating) : ''}
			oninput={(e) => {
				const raw = e.currentTarget.value.trim();
				if (raw === '') {
					setRating?.(null);
					return;
				}
				const n = Number(raw);
				if (!Number.isFinite(n)) return;
				setRating?.(n);
			}}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		/>
	</div>
{:else if colId === 'name'}
	<span class="block min-w-0 truncate font-semibold text-foreground">{placeTitle(p)}</span>
{:else if colId === 'added'}
	{#if typeof p.added === 'string' && p.added.trim()}
		<time
			class="text-muted-foreground text-sm tabular-nums whitespace-nowrap"
			datetime={p.added}
			title={p.added}
		>
			{formatAdded(p.added)}
		</time>
	{:else}
		<span class="text-muted-foreground">—</span>
	{/if}
{:else if colId === 'type'}
	<span class="block min-w-0 truncate">{p.primaryTypeDisplayName?.text ?? ''}</span>
{:else if colId === 'address'}
	<span class="block min-w-0 truncate">{p.formattedAddress ?? ''}</span>
{:else if colId === 'phone'}
	<span class="block min-w-0 truncate">{p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? ''}</span>
{:else if colId === 'rating'}
	<span class="block min-w-0 truncate">{ratingLabel(p)}</span>
{:else if colId === 'visuel_rating'}
	{#if p.visuel_rating != null && String(p.visuel_rating).trim() !== ''}
		<span class="tabular-nums">{String(p.visuel_rating).trim()}</span>
	{:else}
		<span class="text-muted-foreground">—</span>
	{/if}
{:else if colId === 'status'}
	<span class="block min-w-0 truncate">{p.businessStatus ?? ''}</span>
{:else if colId === 'open_now'}
	{#if openNowValue(p) === true}
		Yes
	{:else if openNowValue(p) === false}
		No
	{:else}
		—
	{/if}
{:else if colId === 'hours'}
	<span class="block min-w-0 truncate" title={hoursSummary(p)}>{hoursSummary(p)}</span>
{:else if colId === 'website'}
	{#if p.websiteUri}
		<a
			href={p.websiteUri}
			target="_blank"
			rel="noopener noreferrer"
			class="text-primary font-medium hover:underline"
			onclick={(e) => e.stopPropagation()}
		>
			Link
		</a>
	{/if}
{:else if colId === 'maps'}
	{#if p.googleMapsUri}
		<a
			href={p.googleMapsUri}
			target="_blank"
			rel="noopener noreferrer"
			class="text-primary font-medium hover:underline"
			onclick={(e) => e.stopPropagation()}
		>
			Maps
		</a>
	{/if}
{:else if colId === 'types'}
	<span class="block min-w-0 truncate" title={p.types?.join(' · ') ?? ''}>
		{typesSummary(p)}
	</span>
{:else if colId === 'lat_lng'}
	<span class="block min-w-0 truncate">{placeCoords(p)}</span>
{:else if colId === 'plus_code'}
	<span class="block min-w-0 truncate">{plusCodeText(p)}</span>
{:else if colId === 'price'}
	<span class="block min-w-0 truncate">{priceLevelText(p)}</span>
{/if}
