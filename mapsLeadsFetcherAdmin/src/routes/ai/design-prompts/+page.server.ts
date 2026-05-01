import { readFile } from 'node:fs/promises';
import type { PageServerLoad } from './$types';
import { mapsBusinessesJsonPath } from '$lib/repoPaths';
import { readSettings, taskIdsFromSettings } from '$lib/server/settings';
import { listRunSummaries } from '$lib/server/runs';
import type { AiTaskSettings } from '$lib/ai.types';
import type { MapsBusinessesFile, Place } from '$lib/places.types';

const TOOLTIP_PREVIEW_MAX = 8000;

function isNonEmptyOutputValue(raw: unknown): boolean {
	if (raw == null) return false;
	if (typeof raw === 'string') return raw.trim().length > 0;
	if (typeof raw === 'object') {
		if (Array.isArray(raw)) return raw.length > 0;
		return Object.keys(raw as Record<string, unknown>).length > 0;
	}
	if (typeof raw === 'number' || typeof raw === 'boolean') return true;
	return false;
}

function formatOutputPreview(raw: unknown): string {
	if (raw == null) return '';
	if (typeof raw === 'string') {
		const t = raw.trim();
		return t.length > TOOLTIP_PREVIEW_MAX ? `${t.slice(0, TOOLTIP_PREVIEW_MAX)}…` : t;
	}
	try {
		const s = JSON.stringify(raw, null, 2);
		return s.length > TOOLTIP_PREVIEW_MAX ? `${s.slice(0, TOOLTIP_PREVIEW_MAX)}…` : s;
	} catch {
		const s = String(raw);
		return s.length > TOOLTIP_PREVIEW_MAX ? `${s.slice(0, TOOLTIP_PREVIEW_MAX)}…` : s;
	}
}

export interface PickablePlace {
	id: string;
	name: string;
	subtitle: string | null;
	has_screenshot: boolean;
	/** Whether each task id has a non-empty value in that task's `output_field`. */
	has_task_output: Record<string, boolean>;
	/** Truncated string / pretty JSON for task tooltips when `has_task_output` is true. */
	task_output_preview: Record<string, string>;
}

function toPickable(
	p: Place,
	taskOrder: string[],
	ai_tasks: Record<string, AiTaskSettings>
): PickablePlace {
	const name = p.displayName?.text?.trim() || p.id;
	const subtitle =
		p.primaryTypeDisplayName?.text?.trim() ||
		p.formattedAddress?.trim() ||
		null;
	const rec = p as Record<string, unknown>;
	const has_task_output: Record<string, boolean> = {};
	const task_output_preview: Record<string, string> = {};
	for (const tid of taskOrder) {
		const def = ai_tasks[tid];
		if (!def) continue;
		const field = def.output_field;
		const raw = rec[field];
		const has = isNonEmptyOutputValue(raw);
		has_task_output[tid] = has;
		task_output_preview[tid] = has ? formatOutputPreview(raw) : '';
	}
	const hasScreenshot =
		typeof p.website_screenshot_path === 'string' &&
		p.website_screenshot_path.trim().length > 0;
	return {
		id: p.id,
		name,
		subtitle,
		has_screenshot: hasScreenshot,
		has_task_output,
		task_output_preview
	};
}

export const load: PageServerLoad = async () => {
	const [settings, runs] = await Promise.all([readSettings(), listRunSummaries()]);
	const taskOrder = taskIdsFromSettings(settings);
	const raw = await readFile(mapsBusinessesJsonPath, 'utf-8');
	const data = JSON.parse(raw) as MapsBusinessesFile;
	const places = (data.api_response?.places ?? []).map((p) =>
		toPickable(p, taskOrder, settings.ai_tasks)
	);
	return { settings, runs, places };
};
