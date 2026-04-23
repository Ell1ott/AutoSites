import { readFile } from 'node:fs/promises';
import type { PageServerLoad } from './$types';
import { mapsBusinessesJsonPath } from '$lib/repoPaths';
import { readSettings, taskIdsFromSettings } from '$lib/server/settings';
import type { MapsBusinessesFile } from '$lib/places.types';

export const load: PageServerLoad = async () => {
	const [settings, raw] = await Promise.all([
		readSettings(),
		readFile(mapsBusinessesJsonPath, 'utf-8')
	]);
	const data = JSON.parse(raw) as MapsBusinessesFile;
	const places = data.api_response?.places ?? [];

	const aiTasks = taskIdsFromSettings(settings).map((id) => ({
		id,
		label: settings.ai_tasks[id].label,
		output_field: settings.ai_tasks[id].output_field
	}));

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
		places,
		aiTasks
	};
};
