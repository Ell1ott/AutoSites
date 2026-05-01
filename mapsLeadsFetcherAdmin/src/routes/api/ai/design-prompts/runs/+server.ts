import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listRunSummaries } from '$lib/server/runs';

export const GET: RequestHandler = async () => {
	const runs = await listRunSummaries();
	return json({ runs });
};
