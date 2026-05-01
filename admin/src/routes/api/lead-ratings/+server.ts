import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { normalizeLeadRatingsBody, writeLeadRatingsFile } from '$lib/server/leadRatings';

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}
	const ratings = normalizeLeadRatingsBody(body);
	if (ratings === null) return json({ error: 'Body must be a JSON object' }, { status: 400 });
	await writeLeadRatingsFile(ratings);
	return json({ ok: true });
};
