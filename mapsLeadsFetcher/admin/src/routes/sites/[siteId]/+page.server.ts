import { randomBytes } from 'node:crypto';
import { env as privateEnv } from '$env/dynamic/private';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';
import type { CmsContentRow, SiteAdminRow, SiteRow } from '$lib/sites.types';

/**
 * Origin of the app that serves GET /auth/callback (e.g. http://localhost:3000).
 * Override with CMS_AUTH_CALLBACK_ORIGIN, or AUTH_SITE_URL / CMS_LOGIN_REDIRECT_URL.
 */
function authCallbackOrigin(): string {
	const raw =
		privateEnv.CMS_AUTH_CALLBACK_ORIGIN?.trim() ||
		privateEnv.AUTH_SITE_URL?.trim() ||
		privateEnv.CMS_LOGIN_REDIRECT_URL?.trim() ||
		'http://localhost:3000';
	try {
		return new URL(raw.includes('://') ? raw : `https://${raw}`).origin;
	} catch {
		return 'http://localhost:3000';
	}
}

export const load: PageServerLoad = async ({ params }) => {
	const siteId = params.siteId?.trim();
	if (!siteId) {
		error(404, 'Not found');
	}

	const supabase = getSupabaseAdmin();

	const { data: siteRow, error: siteErr } = await supabase
		.from('sites')
		.select('id, slug, name, created_at')
		.eq('id', siteId)
		.maybeSingle();

	if (siteErr) {
		error(500, siteErr.message);
	}
	if (!siteRow) {
		error(404, 'Site not found');
	}

	const site = siteRow as SiteRow;

	const { data: adminRows, error: adminsErr } = await supabase
		.from('cms_admins')
		.select('user_id, created_at')
		.eq('site_id', siteId)
		.order('created_at', { ascending: false });

	if (adminsErr) {
		error(500, adminsErr.message);
	}

	const admins: SiteAdminRow[] = await Promise.all(
		(adminRows ?? []).map(async (row) => {
			const { data, error: userErr } = await supabase.auth.admin.getUserById(row.user_id);
			if (userErr || !data?.user) {
				return {
					user_id: row.user_id,
					email: null,
					created_at: row.created_at
				};
			}
			return {
				user_id: row.user_id,
				email: data.user.email ?? null,
				created_at: row.created_at
			};
		})
	);

	const { data: contentRows, error: contentErr } = await supabase
		.from('cms_content')
		.select('key, kind, value, updated_at, updated_by')
		.eq('site_id', siteId)
		.order('key', { ascending: true });

	if (contentErr) {
		error(500, contentErr.message);
	}

	const cmsContent = (contentRows ?? []) as CmsContentRow[];

	return { site, admins, cmsContent };
};

export const actions = {
	adminLoginLink: async ({ request, params }) => {
		const siteId = params.siteId?.trim();
		if (!siteId) {
			return fail(400, { message: 'Missing site' });
		}

		const fd = await request.formData();
		const userId = String(fd.get('userId') ?? '').trim();
		if (!userId) {
			return fail(400, { message: 'Missing user' });
		}

		const supabase = getSupabaseAdmin();

		const { data: adminRow, error: adminErr } = await supabase
			.from('cms_admins')
			.select('user_id')
			.eq('site_id', siteId)
			.eq('user_id', userId)
			.maybeSingle();

		if (adminErr) {
			return fail(500, { message: adminErr.message });
		}
		if (!adminRow) {
			return fail(403, { message: 'User is not an admin for this site' });
		}

		const code = randomBytes(32).toString('base64url');
		const { error: upErr } = await supabase
			.from('cms_admins')
			.update({ code })
			.eq('site_id', siteId)
			.eq('user_id', userId);

		if (upErr) {
			return fail(500, { message: upErr.message });
		}

		const base = authCallbackOrigin().replace(/\/$/, '');
		return {
			loginLink: `${base}/auth/callback?code=${encodeURIComponent(code)}&next=/`
		};
	}
} satisfies Actions;
