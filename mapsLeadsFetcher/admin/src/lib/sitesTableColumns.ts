export type SitesTableColumnId = 'name' | 'slug' | 'hosts' | 'created_at';

export const SITES_TABLE_COLUMNS: {
	id: SitesTableColumnId;
	label: string;
	defaultVisible: boolean;
}[] = [
	{ id: 'name', label: 'Name', defaultVisible: true },
	{ id: 'slug', label: 'Slug', defaultVisible: true },
	{ id: 'hosts', label: 'Hosts', defaultVisible: true },
	{ id: 'created_at', label: 'Created', defaultVisible: true }
];

export function defaultSitesVisibleColumns(): Record<SitesTableColumnId, boolean> {
	const r = {} as Record<SitesTableColumnId, boolean>;
	for (const c of SITES_TABLE_COLUMNS) {
		r[c.id] = c.defaultVisible;
	}
	return r;
}
