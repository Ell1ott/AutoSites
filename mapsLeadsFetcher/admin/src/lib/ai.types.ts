export type SubpageMarkdownMode = 'none' | 'all' | 'recommended';

/** Per-task model/prompt options (shared by all AI place tasks). */
export interface DesignPromptSettings {
	meta_prompt: string;
	model: string;
	send_screenshot: boolean;
	send_markdown: boolean;
	/** When send_markdown is true, whether to append crawled sub-page markdown from website_crawl.pages. */
	subpage_markdown_mode: SubpageMarkdownMode;
	/** Place JSON field with structured { subpages: [...] } for recommended mode. */
	recommended_subpages_field: string;
}

/** Full task definition stored under `ai_tasks` in settings.json. */
export interface AiTaskSettings extends DesignPromptSettings {
	label: string;
	/** JSON key on each place for the model output. */
	output_field: string;
	/**
	 * Optional [JSON Schema](https://json-schema.org/) for Gemini structured output.
	 * When set, the model returns JSON matching the schema and it is stored as an object
	 * on each place. Omit for plain text responses.
	 */
	response_json_schema?: Record<string, unknown>;
}

export interface Settings {
	ai_tasks: Record<string, AiTaskSettings>;
	ai_task_order: string[];
}

/** @deprecated Legacy shape; use Settings.ai_tasks */
export interface LegacySettingsShape {
	design_prompt?: DesignPromptSettings;
}

export const DEFAULT_META_PROMPT =
	"You are looking at a screenshot and markdown extract of a business's " +
	'current website. Write a short design brief (3-5 sentences) describing ' +
	'what *feeling* a redesigned version of this website should evoke. Focus ' +
	'purely on mood, atmosphere, aesthetic direction, and emotional tone. ' +
	"Include what the business is about, what it sells, what it does, the " +
	"business's name, and a very short resume of what features / types of " +
	'info the website has. DO NOT mention specific copy, product names, ' +
	'addresses, contact details, or other literal page content.';

export const DEFAULT_WEBSITE_OVERVIEW_META =
	'You are given a screenshot and a markdown extract of a business website. ' +
	'Write a concise general overview (4–8 sentences) of what the website is for, ' +
	'who it serves, main sections or offerings implied by the layout, and any ' +
	'notable functional patterns (e.g. booking, shop, menu). Stay high-level; ' +
	'do not quote specific headlines, prices, addresses, or phone numbers.';

export const DEFAULT_DESIGN_PROMPT_SETTINGS: DesignPromptSettings = {
	meta_prompt: DEFAULT_META_PROMPT,
	model: 'gemini-3-flash-preview',
	send_screenshot: true,
	send_markdown: true,
	subpage_markdown_mode: 'none',
	recommended_subpages_field: 'ai_subpages'
};

export type RunScopeMode = 'all-new' | 'pick' | 'limit';

export interface RunScope {
	mode: RunScopeMode | string;
	place_ids: string[];
	limit: number | null;
	force?: boolean;
	/** Parallel Gemini calls (generate_design_prompts.py --workers). */
	workers?: number;
	subpage_markdown_mode?: SubpageMarkdownMode | string;
	recommended_subpages_field?: string;
}

export type RunItemStatus = 'ok' | 'failed' | 'skipped';

export interface RunItemMarkdownFile {
	path: string;
	role: 'root' | 'subpage';
	url?: string | null;
}

/** Files actually sent to Gemini for this place in this run (from generate_design_prompts.py). */
export interface RunItemInputsUsed {
	screenshot_path: string | null;
	markdown_files: RunItemMarkdownFile[];
}

export interface RunItem {
	place_id: string;
	place_name: string;
	status: RunItemStatus;
	before: string | null;
	after: string | null;
	error: string | null;
	inputs_used?: RunItemInputsUsed;
}

export type RunStatus = 'ok' | 'failed' | 'partial';

export interface RunCounts {
	processed: number;
	generated: number;
	skipped: number;
	failed: number;
}

/** Older runs only stored DesignPromptSettings (task implied by `tool`). */
export type RunSettingsSnapshot = AiTaskSettings | DesignPromptSettings;

export interface RunEntry {
	id: string;
	started_at: string;
	finished_at: string;
	/** Task id for this run (same as CLI `--task`). */
	tool: string;
	status: RunStatus;
	settings_snapshot: RunSettingsSnapshot;
	scope: RunScope;
	counts: RunCounts;
	items: RunItem[];
}

export type RunSummary = Omit<RunEntry, 'items' | 'settings_snapshot'> & {
	settings_snapshot: { model: string; label?: string; output_field?: string };
	task_id: string;
};

export type RunEventType =
	| 'run_started'
	| 'place_generating'
	| 'place_done'
	| 'place_failed'
	| 'place_skipped'
	| 'run_finished';

export interface RunStartedEvent {
	type: 'run_started';
	runId: string;
	taskId: string;
	total: number;
	scope: RunScope;
	settings: AiTaskSettings;
}

export interface PlaceGeneratingEvent {
	type: 'place_generating';
	placeId: string;
	name: string;
	index: number;
	total: number;
}

export interface PlaceDoneEvent {
	type: 'place_done';
	placeId: string;
	name: string;
	before: string | null;
	after: string;
	inputs_used?: RunItemInputsUsed;
}

export interface PlaceFailedEvent {
	type: 'place_failed';
	placeId: string;
	name: string;
	error: string;
	inputs_used?: RunItemInputsUsed;
}

export interface PlaceSkippedEvent {
	type: 'place_skipped';
	placeId: string;
	name: string;
	reason: 'no_screenshot' | 'no_markdown' | 'already_generated' | string;
}

export interface RunFinishedEvent {
	type: 'run_finished';
	runId: string;
	counts: RunCounts;
	status: RunStatus;
}

export type RunEvent =
	| RunStartedEvent
	| PlaceGeneratingEvent
	| PlaceDoneEvent
	| PlaceFailedEvent
	| PlaceSkippedEvent
	| RunFinishedEvent;

export interface RunsFile {
	runs: RunEntry[];
}
