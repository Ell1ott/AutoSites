export type SiteRow = {
	id: string;
	slug: string;
	name: string;
	created_at: string;
};

export type SiteAdminRow = {
	user_id: string;
	email: string | null;
	created_at: string;
};

export type CmsContentKind = 'text' | 'image' | 'link';

export type CmsContentRow = {
	key: string;
	kind: CmsContentKind;
	value: unknown;
	updated_at: string;
	updated_by: string | null;
};
