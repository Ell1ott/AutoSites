import { readFile } from 'node:fs/promises';
import type { RequestHandler } from './$types';
import { screenshotPath } from '$lib/repoPaths';

export const GET: RequestHandler = async ({ params }) => {
	const filePath = screenshotPath(params.placeId);
	try {
		const buf = await readFile(filePath);
		return new Response(buf, {
			headers: {
				'Content-Type': 'image/png',
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch {
		return new Response(null, { status: 404 });
	}
};
