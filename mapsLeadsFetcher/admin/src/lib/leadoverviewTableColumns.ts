export type TableColumnId =
	| 'screenshot'
	| 'name'
	| 'added'
	| 'type'
	| 'address'
	| 'phone'
	| 'rating'
	| 'visuel_rating'
	| 'status'
	| 'open_now'
	| 'hours'
	| 'website'
	| 'maps'
	| 'types'
	| 'lat_lng'
	| 'plus_code'
	| 'price';

export const TABLE_COLUMNS: { id: TableColumnId; label: string; defaultVisible: boolean }[] = [
	{ id: 'screenshot', label: 'Screenshot', defaultVisible: true },
	{ id: 'name', label: 'Name', defaultVisible: true },
	{ id: 'added', label: 'Added', defaultVisible: true },
	{ id: 'type', label: 'Type', defaultVisible: true },
	{ id: 'address', label: 'Address', defaultVisible: true },
	{ id: 'rating', label: 'Rating', defaultVisible: true },
	{ id: 'visuel_rating', label: 'Visuel rating', defaultVisible: true },
	{ id: 'website', label: 'Website', defaultVisible: true },
	{ id: 'maps', label: 'Maps', defaultVisible: true },
	{ id: 'open_now', label: 'Open now', defaultVisible: true },
	{ id: 'phone', label: 'Phone', defaultVisible: false },
	{ id: 'status', label: 'Status', defaultVisible: false },
	{ id: 'hours', label: 'Hours', defaultVisible: false },
	{ id: 'types', label: 'Categories', defaultVisible: false },
	{ id: 'lat_lng', label: 'Lat / lng', defaultVisible: false },
	{ id: 'plus_code', label: 'Plus code', defaultVisible: false },
	{ id: 'price', label: 'Price level', defaultVisible: false }
];

export function defaultVisibleColumns(): Record<TableColumnId, boolean> {
	const r = {} as Record<TableColumnId, boolean>;
	for (const c of TABLE_COLUMNS) {
		r[c.id] = c.defaultVisible;
	}
	return r;
}
