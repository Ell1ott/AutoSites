import type { Place } from '$lib/places.types';
import { placeTitle } from '$lib/places';

export type WebsiteFilter = 'all' | 'with' | 'without';
export type CrawlFilter = 'all' | 'multi' | 'none';
export type OpenNowFilter = 'all' | 'open' | 'closed';

function hasWebsite(p: Place): boolean {
	return typeof p.websiteUri === 'string' && p.websiteUri.trim().length > 0;
}

function crawlPageCount(p: Place): number {
	return p.website_crawl?.pages?.length ?? 0;
}

/** Matches 2+ crawled subpages (same badge as “N pages” in the grid). */
function hasMultiPageCrawl(p: Place): boolean {
	return crawlPageCount(p) >= 2;
}

function openNowValue(p: Place): boolean | null {
	const v = p.regularOpeningHours?.openNow ?? p.currentOpeningHours?.openNow;
	if (v === true) return true;
	if (v === false) return false;
	return null;
}

export function matchesSearch(p: Place, q: string): boolean {
	const t = q.trim().toLowerCase();
	if (!t) return true;
	const name = placeTitle(p).toLowerCase();
	const addr = (p.formattedAddress ?? '').toLowerCase();
	const type = (p.primaryTypeDisplayName?.text ?? '').toLowerCase();
	const types = (p.types ?? []).join(' ').toLowerCase();
	return name.includes(t) || addr.includes(t) || type.includes(t) || types.includes(t);
}

/** User score (1–10) from lead overview; coerced for comparison. */
function leadScore(
	p: Place,
	byId: Record<string, number>
): number | undefined {
	const raw = byId[p.id];
	if (typeof raw !== 'number' || Number.isNaN(raw)) return undefined;
	return raw;
}

export function filterPlaces(
	places: Place[],
	opts: {
		search: string;
		website: WebsiteFilter;
		crawl: CrawlFilter;
		minRating: string;
		minReviewCount: string;
		leadScoreGreaterThan: string;
		leadRatingByPlaceId: Record<string, number>;
		openNow: OpenNowFilter;
	}
): Place[] {
	return places.filter((p) => {
		if (!matchesSearch(p, opts.search)) return false;

		if (opts.website === 'with' && !hasWebsite(p)) return false;
		if (opts.website === 'without' && hasWebsite(p)) return false;

		if (opts.crawl === 'multi' && !hasMultiPageCrawl(p)) return false;
		if (opts.crawl === 'none' && hasMultiPageCrawl(p)) return false;

		if (opts.minRating) {
			const min = parseFloat(opts.minRating);
			if (Number.isNaN(min) || p.rating == null || p.rating < min) return false;
		}

		if (opts.minReviewCount) {
			const min = parseInt(opts.minReviewCount, 10);
			if (!Number.isNaN(min)) {
				const n = p.userRatingCount;
				if (n == null || typeof n !== 'number' || n < min) return false;
			}
		}

		if (opts.leadScoreGreaterThan !== '') {
			const gt = parseFloat(opts.leadScoreGreaterThan);
			if (!Number.isNaN(gt)) {
				const s = leadScore(p, opts.leadRatingByPlaceId);
				if (s == null || s <= gt) return false;
			}
		}

		if (opts.openNow === 'open') {
			if (openNowValue(p) !== true) return false;
		}
		if (opts.openNow === 'closed') {
			if (openNowValue(p) !== false) return false;
		}

		return true;
	});
}

export function isFilterActive(opts: {
	search: string;
	website: WebsiteFilter;
	crawl: CrawlFilter;
	minRating: string;
	minReviewCount: string;
	leadScoreGreaterThan: string;
	openNow: OpenNowFilter;
}): boolean {
	return (
		opts.search.trim() !== '' ||
		opts.website !== 'all' ||
		opts.crawl !== 'all' ||
		opts.minRating !== '' ||
		opts.minReviewCount !== '' ||
		opts.leadScoreGreaterThan !== '' ||
		opts.openNow !== 'all'
	);
}
