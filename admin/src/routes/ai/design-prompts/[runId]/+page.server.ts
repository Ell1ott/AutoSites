import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRun } from '$lib/server/runs';

export const load: PageServerLoad = async ({ params }) => {
	const run = await getRun(params.runId);
	if (!run) error(404, 'Run not found');
	return { run };
};
