import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	readSettings,
	validateAiTaskSettings,
	finalizeTaskBody,
	writeAiTask,
	validateNewTaskId
} from '$lib/server/settings';

export const GET: RequestHandler = async () => {
	const settings = await readSettings();
	return json(settings);
};

export const PUT: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Body must be valid JSON');
	}
	if (!body || typeof body !== 'object') {
		error(400, 'Body must be an object');
	}
	const obj = body as Record<string, unknown>;
	const taskIdRaw = obj.taskId;
	if (typeof taskIdRaw !== 'string' || !taskIdRaw.trim()) {
		error(400, 'taskId must be a non-empty string');
	}
	const taskId = taskIdRaw.trim();

	const current = await readSettings();
	if (!(taskId in current.ai_tasks)) {
		const idErr = validateNewTaskId(taskId);
		if (idErr) error(400, idErr);
	}

	const { taskId: _omit, ...rest } = obj;
	const result = validateAiTaskSettings(rest);
	if (!result.ok) error(400, result.error);

	try {
		const existing = current.ai_tasks[taskId];
		let task = finalizeTaskBody(taskId, result.value);
		if (!('response_json_schema' in rest)) {
			if (existing?.response_json_schema) {
				task = { ...task, response_json_schema: existing.response_json_schema };
			}
		} else if (rest.response_json_schema === null) {
			const { response_json_schema: _omit, ...cleared } = task;
			task = cleared;
		}
		const saved = await writeAiTask(taskId, task);
		return json(saved);
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		error(400, msg);
	}
};
