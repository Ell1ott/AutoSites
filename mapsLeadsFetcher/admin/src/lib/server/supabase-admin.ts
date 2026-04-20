import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

let client: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
	if (!client) {
		const url = publicEnv.PUBLIC_SUPABASE_URL;
		const key = privateEnv.SUPABASE_SERVICE_ROLE_KEY;
		if (!url || !key) {
			throw new Error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
		}
		client = createClient(url, key, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
	}
	return client;
}
