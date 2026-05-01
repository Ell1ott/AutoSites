import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

function findMapsLeadsFetcherRoot(): string {
	const starts = [fileURLToPath(new URL('.', import.meta.url)), process.cwd()];
	for (const start of starts) {
		let dir = start;
		while (true) {
			const ml = join(dir, 'mapsLeadsFetcher');
			if (existsSync(join(ml, 'pyproject.toml'))) {
				return ml;
			}
			const parent = dirname(dir);
			if (parent === dir) break;
			dir = parent;
		}
	}
	throw new Error(
		'Could not locate mapsLeadsFetcher (expected <repo>/mapsLeadsFetcher/pyproject.toml)'
	);
}

/** Python project root `mapsLeadsFetcher/` (JSON, screenshots, scripts). */
export const mapsLeadsFetcherRoot = findMapsLeadsFetcherRoot();

export const mapsBusinessesJsonPath = join(mapsLeadsFetcherRoot, 'maps_businesses.json');

/** User lead scores (1–10) keyed by place id; written by the admin UI. */
export const leadRatingsJsonPath = join(mapsLeadsFetcherRoot, 'lead_ratings.json');

export const settingsJsonPath = join(mapsLeadsFetcherRoot, 'settings.json');

export const runsJsonPath = join(mapsLeadsFetcherRoot, 'runs.json');

export function screenshotPath(placeId: string): string {
	return join(mapsLeadsFetcherRoot, 'screenshots', `${placeId}.png`);
}

/**
 * Resolve a repo-relative path (e.g. `screenshots/id__abc.png`) to an absolute path.
 * Returns null if the path escapes `mapsLeadsFetcher/screenshots/`.
 */
export function resolveScreenshotAsset(relFromRepoRoot: string): string | null {
	const trimmed = relFromRepoRoot.trim().replace(/^\/+/, '');
	if (!trimmed || trimmed.includes('\0')) return null;
	const abs = resolve(mapsLeadsFetcherRoot, trimmed);
	const rel = relative(mapsLeadsFetcherRoot, abs);
	const forward = rel.split(sep).join('/');
	if (rel.startsWith('..') || !forward.startsWith('screenshots/')) return null;
	return abs;
}
