import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';
import type { SiteWithHosts } from '$lib/sites.types';

export const load: PageServerLoad = async () => {
	const supabase = getSupabaseAdmin();
	const { data, error: qError } = await supabase
		.from('sites')
		.select('id, slug, name, created_at, site_hosts(host)')
		.order('created_at', { ascending: false });

	if (qError) {
		error(500, qError.message);
	}

	return { sites: (data ?? []) as SiteWithHosts[] };
};
