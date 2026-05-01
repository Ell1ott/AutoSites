import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRun } from '$lib/server/runs';

export const GET: RequestHandler = async ({ params }) => {
	const run = await getRun(params.runId);
	if (!run) error(404, 'Run not found');
	return json(run);
};
