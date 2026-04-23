import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const libDir = fileURLToPath(new URL('.', import.meta.url));

/** Repo root `mapsLeadsFetcher/` (parent of `leadsOverview/`). */
export const mapsLeadsFetcherRoot = join(libDir, '../../..');

export const mapsBusinessesJsonPath = join(mapsLeadsFetcherRoot, 'maps_businesses.json');

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
