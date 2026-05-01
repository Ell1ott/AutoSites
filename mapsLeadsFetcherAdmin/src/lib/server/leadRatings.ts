import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { leadRatingsJsonPath } from '$lib/repoPaths';

export function parseLeadRatingsJson(raw: string): Record<string, number> {
	const parsed = JSON.parse(raw) as Record<string, unknown>;
	const next: Record<string, number> = {};
	for (const [k, v] of Object.entries(parsed)) {
		if (typeof v === 'number' && v >= 1 && v <= 10 && Number.isInteger(v)) next[k] = v;
	}
	return next;
}

export async function readLeadRatingsFile(): Promise<Record<string, number>> {
	if (!existsSync(leadRatingsJsonPath)) return {};
	try {
		const raw = await readFile(leadRatingsJsonPath, 'utf-8');
		return parseLeadRatingsJson(raw);
	} catch {
		return {};
	}
}

/** Accepts a JSON object; only valid placeId → 1–10 integer entries are kept. */
export function normalizeLeadRatingsBody(body: unknown): Record<string, number> | null {
	if (body === null || typeof body !== 'object' || Array.isArray(body)) return null;
	const next: Record<string, number> = {};
	for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
		if (typeof v === 'number' && v >= 1 && v <= 10 && Number.isInteger(v)) next[k] = v;
	}
	return next;
}

export async function writeLeadRatingsFile(data: Record<string, number>): Promise<void> {
	const json = `${JSON.stringify(data, null, 2)}\n`;
	await writeFile(leadRatingsJsonPath, json, 'utf-8');
}
