import { readFile } from 'node:fs/promises';
import type { RequestHandler } from './$types';
import { resolveScreenshotAsset } from '$lib/repoPaths';

export const GET: RequestHandler = async ({ url }) => {
	const rel = url.searchParams.get('rel');
	if (!rel) return new Response(null, { status: 400 });
	const filePath = resolveScreenshotAsset(rel);
	if (!filePath) return new Response(null, { status: 404 });
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
