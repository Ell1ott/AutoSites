import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { settingsJsonPath } from '$lib/repoPaths';
import {
	DEFAULT_DESIGN_PROMPT_SETTINGS,
	DEFAULT_WEBSITE_OVERVIEW_META,
	type AiTaskSettings,
	type DesignPromptSettings,
	type Settings,
	type SubpageMarkdownMode
} from '$lib/ai.types';

const MAX_META_PROMPT_LEN = 8000;
const MAX_LABEL_LEN = 120;
const MAX_OUTPUT_FIELD_LEN = 120;
const MAX_TASK_ID_LEN = 64;
const OUTPUT_FIELD_RE = /^[a-z][a-z0-9_]*$/i;

/** Validates `taskId` when creating a task that does not yet exist in `ai_tasks`. */
export function validateNewTaskId(taskId: string): string | null {
	const t = taskId.trim();
	if (!t) return 'task id is required';
	if (t.length > MAX_TASK_ID_LEN) return `task id must be ≤ ${MAX_TASK_ID_LEN} characters`;
	if (!OUTPUT_FIELD_RE.test(t)) {
		return 'task id must start with a letter and contain only letters, digits, underscores';
	}
	return null;
}

function mergeDesignPromptFields(
	base: DesignPromptSettings,
	partial: Partial<DesignPromptSettings> | undefined
): DesignPromptSettings {
	const out = { ...base };
	if (!partial) return out;
	if (typeof partial.meta_prompt === 'string') out.meta_prompt = partial.meta_prompt;
	if (typeof partial.model === 'string') out.model = partial.model;
	if (typeof partial.send_screenshot === 'boolean')
		out.send_screenshot = partial.send_screenshot;
	if (typeof partial.send_markdown === 'boolean')
		out.send_markdown = partial.send_markdown;
	if (typeof partial.subpage_markdown_mode === 'string') {
		const m = partial.subpage_markdown_mode;
		if (m === 'none' || m === 'all' || m === 'recommended') {
			out.subpage_markdown_mode = m;
		}
	}
	if (
		typeof partial.recommended_subpages_field === 'string' &&
		partial.recommended_subpages_field.trim()
	) {
		out.recommended_subpages_field = partial.recommended_subpages_field.trim();
	}
	return out;
}

function defaultTaskForId(taskId: string): AiTaskSettings {
	if (taskId === 'design_prompt') {
		return {
			label: 'Design brief',
			output_field: 'design_prompt',
			...DEFAULT_DESIGN_PROMPT_SETTINGS
		};
	}
	if (taskId === 'website_overview') {
		return {
			...DEFAULT_DESIGN_PROMPT_SETTINGS,
			label: 'Website overview',
			output_field: 'website_overview',
			meta_prompt: DEFAULT_WEBSITE_OVERVIEW_META
		};
	}
	const words = taskId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	return {
		label: words,
		output_field: taskId,
		...DEFAULT_DESIGN_PROMPT_SETTINGS
	};
}

function defaultSettings(): Settings {
	const order = ['design_prompt', 'website_overview'] as const;
	const ai_tasks: Record<string, AiTaskSettings> = {};
	for (const id of order) {
		ai_tasks[id] = defaultTaskForId(id);
	}
	return { ai_tasks, ai_task_order: [...order] };
}

function mergeAiTask(taskId: string, partial: Record<string, unknown> | undefined): AiTaskSettings {
	const base = defaultTaskForId(taskId);
	if (!partial || typeof partial !== 'object') return base;
	const p = partial;
	const core = mergeDesignPromptFields(
		{
			meta_prompt: base.meta_prompt,
			model: base.model,
			send_screenshot: base.send_screenshot,
			send_markdown: base.send_markdown,
			subpage_markdown_mode: base.subpage_markdown_mode,
			recommended_subpages_field: base.recommended_subpages_field
		},
		p as Partial<DesignPromptSettings>
	);
	let label = base.label;
	if (typeof p.label === 'string' && p.label.trim()) label = p.label.trim();
	let output_field = base.output_field;
	if (typeof p.output_field === 'string' && p.output_field.trim())
		output_field = p.output_field.trim();
	const out: AiTaskSettings = {
		label,
		output_field,
		...core
	};
	if ('response_json_schema' in p) {
		const r = p.response_json_schema;
		if (r !== null && r !== undefined) {
			if (typeof r === 'object' && !Array.isArray(r)) {
				out.response_json_schema = r as Record<string, unknown>;
			}
		}
	}
	return out;
}

function normalizeTaskOrder(
	order: unknown,
	taskIds: string[]
): string[] {
	const idSet = new Set(taskIds);
	if (Array.isArray(order)) {
		const seen = new Set<string>();
		const out: string[] = [];
		for (const x of order) {
			if (typeof x !== 'string' || !idSet.has(x) || seen.has(x)) continue;
			seen.add(x);
			out.push(x);
		}
		for (const id of taskIds) {
			if (!seen.has(id)) out.push(id);
		}
		return out;
	}
	return [...taskIds].sort();
}

type RawFile = {
	ai_tasks?: unknown;
	ai_task_order?: unknown;
	design_prompt?: unknown;
};

export async function readSettings(): Promise<Settings> {
	try {
		const raw = await readFile(settingsJsonPath, 'utf-8');
		const parsed = JSON.parse(raw) as RawFile;

		if (parsed.ai_tasks && typeof parsed.ai_tasks === 'object' && !Array.isArray(parsed.ai_tasks)) {
			const rawTasks = parsed.ai_tasks as Record<string, unknown>;
			const ai_tasks: Record<string, AiTaskSettings> = {};
			for (const taskId of Object.keys(rawTasks)) {
				if (!taskId.trim()) continue;
				const block = rawTasks[taskId];
				ai_tasks[taskId] = mergeAiTask(
					taskId,
					typeof block === 'object' && block !== null ? (block as Record<string, unknown>) : undefined
				);
			}
			if (Object.keys(ai_tasks).length === 0) {
				return defaultSettings();
			}
			const ai_task_order = normalizeTaskOrder(parsed.ai_task_order, Object.keys(ai_tasks));
			return { ai_tasks, ai_task_order };
		}

		if (parsed.design_prompt && typeof parsed.design_prompt === 'object') {
			const legacy = mergeDesignPromptFields(
				{ ...DEFAULT_DESIGN_PROMPT_SETTINGS },
				parsed.design_prompt as Partial<DesignPromptSettings>
			);
			return {
				ai_tasks: {
					design_prompt: {
						label: 'Design brief',
						output_field: 'design_prompt',
						...legacy
					}
				},
				ai_task_order: ['design_prompt']
			};
		}

		return defaultSettings();
	} catch (err: unknown) {
		if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
			return defaultSettings();
		}
		throw err;
	}
}

function assertUniqueOutputFields(tasks: Record<string, AiTaskSettings>): string | null {
	const seen = new Map<string, string>();
	for (const [taskId, t] of Object.entries(tasks)) {
		const f = t.output_field;
		if (seen.has(f)) {
			return `Duplicate output_field "${f}" on tasks "${seen.get(f)}" and "${taskId}"`;
		}
		seen.set(f, taskId);
	}
	return null;
}

export function validateAiTaskSettings(
	input: unknown
): { ok: true; value: AiTaskSettings } | { ok: false; error: string } {
	if (!input || typeof input !== 'object') {
		return { ok: false, error: 'Body must be an object' };
	}
	const obj = input as Record<string, unknown>;

	if (typeof obj.label !== 'string' || !obj.label.trim()) {
		return { ok: false, error: 'label must be a non-empty string' };
	}
	if (obj.label.length > MAX_LABEL_LEN) {
		return { ok: false, error: `label must be ≤ ${MAX_LABEL_LEN} characters` };
	}

	if (obj.output_field !== undefined) {
		if (typeof obj.output_field !== 'string' || !obj.output_field.trim()) {
			return { ok: false, error: 'output_field must be a non-empty string when set' };
		}
		if (!OUTPUT_FIELD_RE.test(obj.output_field.trim())) {
			return {
				ok: false,
				error:
					'output_field must start with a letter and contain only letters, digits, underscores'
			};
		}
		if (obj.output_field.length > MAX_OUTPUT_FIELD_LEN) {
			return { ok: false, error: `output_field must be ≤ ${MAX_OUTPUT_FIELD_LEN} characters` };
		}
	}

	if (typeof obj.meta_prompt !== 'string' || !obj.meta_prompt.trim()) {
		return { ok: false, error: 'meta_prompt must be a non-empty string' };
	}
	if (obj.meta_prompt.length > MAX_META_PROMPT_LEN) {
		return { ok: false, error: `meta_prompt must be ≤ ${MAX_META_PROMPT_LEN} characters` };
	}
	if (typeof obj.model !== 'string' || !obj.model.trim()) {
		return { ok: false, error: 'model must be a non-empty string' };
	}
	if (typeof obj.send_screenshot !== 'boolean') {
		return { ok: false, error: 'send_screenshot must be a boolean' };
	}
	if (typeof obj.send_markdown !== 'boolean') {
		return { ok: false, error: 'send_markdown must be a boolean' };
	}
	if (!obj.send_screenshot && !obj.send_markdown) {
		return {
			ok: false,
			error: 'At least one of send_screenshot or send_markdown must be true'
		};
	}

	let subpage_markdown_mode: SubpageMarkdownMode = 'none';
	if (obj.subpage_markdown_mode !== undefined) {
		const m = obj.subpage_markdown_mode;
		if (m !== 'none' && m !== 'all' && m !== 'recommended') {
			return {
				ok: false,
				error: 'subpage_markdown_mode must be none, all, or recommended'
			};
		}
		subpage_markdown_mode = m;
	}
	let recommended_subpages_field = 'ai_subpages';
	if (obj.recommended_subpages_field !== undefined) {
		if (typeof obj.recommended_subpages_field !== 'string' || !obj.recommended_subpages_field.trim()) {
			return {
				ok: false,
				error: 'recommended_subpages_field must be a non-empty string when set'
			};
		}
		recommended_subpages_field = obj.recommended_subpages_field.trim();
	}

	let response_json_schema: Record<string, unknown> | undefined;
	if (obj.response_json_schema !== undefined && obj.response_json_schema !== null) {
		if (typeof obj.response_json_schema !== 'object' || Array.isArray(obj.response_json_schema)) {
			return {
				ok: false,
				error: 'response_json_schema must be a JSON object when set'
			};
		}
		response_json_schema = obj.response_json_schema as Record<string, unknown>;
	}

	const output_field =
		typeof obj.output_field === 'string' && obj.output_field.trim()
			? obj.output_field.trim()
			: '';

	const value: AiTaskSettings = {
		label: obj.label.trim(),
		output_field,
		meta_prompt: obj.meta_prompt,
		model: obj.model,
		send_screenshot: obj.send_screenshot,
		send_markdown: obj.send_markdown,
		subpage_markdown_mode,
		recommended_subpages_field
	};
	if (response_json_schema !== undefined) {
		value.response_json_schema = response_json_schema;
	}
	return { ok: true, value };
}

/** Merge validated task body with existing task (keeps output_field default from task id when omitted). */
export function finalizeTaskBody(taskId: string, validated: AiTaskSettings): AiTaskSettings {
	const base = mergeAiTask(taskId, undefined);
	const output_field = validated.output_field.trim() ? validated.output_field.trim() : base.output_field;
	return {
		...validated,
		output_field
	};
}

export async function writeAiTask(taskId: string, task: AiTaskSettings): Promise<Settings> {
	if (!taskId.trim()) {
		throw new Error('taskId must be non-empty');
	}
	const current = await readSettings();
	const nextTasks = { ...current.ai_tasks, [taskId]: task };
	const dup = assertUniqueOutputFields(nextTasks);
	if (dup) {
		throw new Error(dup);
	}
	let order = current.ai_task_order.includes(taskId)
		? [...current.ai_task_order]
		: [...current.ai_task_order, taskId];
	order = normalizeTaskOrder(order, Object.keys(nextTasks));
	const merged: Settings = { ai_tasks: nextTasks, ai_task_order: order };
	await mkdir(dirname(settingsJsonPath), { recursive: true });
	await writeFile(
		settingsJsonPath,
		JSON.stringify({ ai_tasks: merged.ai_tasks, ai_task_order: merged.ai_task_order }, null, 2) +
			'\n',
		'utf-8'
	);
	return merged;
}

export function taskIdsFromSettings(s: Settings): string[] {
	return s.ai_task_order.filter((id) => id in s.ai_tasks);
}
