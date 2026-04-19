import { readFile } from 'node:fs/promises';
import type { PageServerLoad } from './$types';
import { mapsBusinessesJsonPath } from '$lib/repoPaths';
import type { MapsBusinessesFile } from '$lib/places.types';

export const load: PageServerLoad = async () => {
	const raw = await readFile(mapsBusinessesJsonPath, 'utf-8');
	const data = JSON.parse(raw) as MapsBusinessesFile;
	const places = data.api_response?.places ?? [];

	return {
		meta: {
			fetched_at: data.fetched_at,
			query: data.query,
			requested_count: data.requested_count,
			returned_count: data.returned_count,
			search_center: data.search_center,
			bias_radius_meters: data.bias_radius_meters,
			rank_preference: data.rank_preference
		},
		places
	};
};
