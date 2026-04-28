<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import {
		type ColumnFiltersState,
		type RowSelectionState,
		type SortingState,
		type VisibilityState,
		getCoreRowModel,
		getFilteredRowModel,
		getSortedRowModel
	} from '@tanstack/table-core';
	import type { Place } from '$lib/places.types';
	import { TABLE_COLUMNS, type TableColumnId } from '$lib/leadoverviewTableColumns';
	import { placeTitle } from '$lib/places';
	import { cn } from '$lib/utils.js';
	import {
		createSvelteTable,
		FlexRender,
		renderComponent
	} from '$lib/components/ui/data-table/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import DataTableCheckbox from '$lib/components/data-table-checkbox.svelte';
	import LeadOverviewColumnHeader from '$lib/components/lead-overview-column-header.svelte';
	import LeadOverviewTableCell from '$lib/components/lead-overview-table-cell.svelte';

	type LeadOverviewMeta = {
		failedScreenshots: Record<string, boolean>;
		leadRatingByPlaceId: Record<string, number>;
		onImgError: (id: string) => void;
		onExpandScreenshot: (p: Place) => void;
		setLeadRating: (id: string, value: number | null) => void;
	};

	const SORTABLE: TableColumnId[] = [
		'interested',
		'name',
		'added',
		'type',
		'address',
		'phone',
		'rating',
		'visuel_rating',
		'status',
		'open_now',
		'price'
	];

	function sortValue(
		colId: TableColumnId,
		p: Place,
		leadRatingByPlaceId: Record<string, number>
	): string | number {
		switch (colId) {
			case 'interested':
				return leadRatingByPlaceId[p.id] ?? -1;
			case 'name':
				return placeTitle(p);
			case 'added':
				return typeof p.added === 'string' ? p.added : '';
			case 'type':
				return p.primaryTypeDisplayName?.text ?? '';
			case 'address':
				return p.formattedAddress ?? '';
			case 'phone':
				return p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? '';
			case 'rating':
				return p.rating ?? -1;
			case 'visuel_rating': {
				const v = p.visuel_rating;
				if (v == null) return -1;
				if (typeof v === 'number' && !Number.isNaN(v)) return v;
				if (typeof v === 'string') {
					const n = parseFloat(v.trim());
					if (!Number.isNaN(n)) return n;
				}
				return -1;
			}
			case 'status':
				return p.businessStatus ?? '';
			case 'open_now': {
				const v = p.regularOpeningHours?.openNow ?? p.currentOpeningHours?.openNow;
				if (v === true) return 1;
				if (v === false) return 0;
				return -1;
			}
			case 'price':
				return typeof p.priceLevel === 'string' ? p.priceLevel : '';
			default:
				return '';
		}
	}

	let {
		places,
		visibleColumns = $bindable(),
		selectedId,
		failedScreenshots,
		leadRatingByPlaceId,
		onSelectPlace,
		onImgError,
		onExpandScreenshot,
		setLeadRating,
		onColumnVisibilityPersist
	}: {
		places: Place[];
		visibleColumns: Record<TableColumnId, boolean>;
		selectedId: string | null;
		failedScreenshots: Record<string, boolean>;
		leadRatingByPlaceId: Record<string, number>;
		onSelectPlace: (p: Place) => void;
		onImgError: (id: string) => void;
		onExpandScreenshot: (p: Place) => void;
		setLeadRating: (id: string, value: number | null) => void;
		onColumnVisibilityPersist?: () => void;
	} = $props();

	let sorting = $state<SortingState>([]);
	let columnFilters = $state<ColumnFiltersState>([]);
	let rowSelection = $state<RowSelectionState>({});

	const columns = $derived.by((): ColumnDef<Place>[] => [
		{
			id: 'select',
			header: ({ table }) =>
				renderComponent(DataTableCheckbox, {
					checked: table.getIsAllPageRowsSelected(),
					indeterminate:
						table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
					onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value),
					'aria-label': 'Select all'
				}),
			cell: ({ row }) =>
				renderComponent(DataTableCheckbox, {
					checked: row.getIsSelected(),
					onCheckedChange: (value) => row.toggleSelected(!!value),
					'aria-label': 'Select row'
				}),
			enableSorting: false,
			enableHiding: false
		},
		...TABLE_COLUMNS.map((col): ColumnDef<Place> => {
			const sortable = SORTABLE.includes(col.id);
			return {
				id: col.id,
				accessorFn: (row) => sortValue(col.id, row, leadRatingByPlaceId),
				header: sortable
					? ({ column }) =>
							renderComponent(LeadOverviewColumnHeader, {
								label: col.label,
								onToggleSort: column.getToggleSortingHandler() ?? (() => {}),
								sortState: column.getIsSorted()
							})
					: col.label,
				enableSorting: sortable,
				enableHiding: true,
				cell: ({ row, table }) => {
					const meta = table.options.meta as LeadOverviewMeta;
					return renderComponent(LeadOverviewTableCell, {
						place: row.original,
						colId: col.id,
						failedScreenshot: !!meta.failedScreenshots[row.original.id],
						leadRating: meta.leadRatingByPlaceId[row.original.id],
						onImgError: () => meta.onImgError(row.original.id),
						onExpandScreenshot: () => meta.onExpandScreenshot(row.original),
						setRating: (value) => meta.setLeadRating(row.original.id, value)
					});
				}
			};
		})
	]);

	const table = createSvelteTable({
		get data() {
			return places;
		},
		get columns() {
			return columns;
		},
		getRowId: (row) => row.id,
		get meta(): LeadOverviewMeta {
			return {
				failedScreenshots,
				leadRatingByPlaceId,
				onImgError,
				onExpandScreenshot,
				setLeadRating
			};
		},
		state: {
			get sorting() {
				return sorting;
			},
			get columnVisibility() {
				return visibleColumns as VisibilityState;
			},
			get rowSelection() {
				return rowSelection;
			},
			get columnFilters() {
				return columnFilters;
			}
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onSortingChange: (updater) => {
			if (typeof updater === 'function') {
				sorting = updater(sorting);
			} else {
				sorting = updater;
			}
		},
		onColumnFiltersChange: (updater) => {
			if (typeof updater === 'function') {
				columnFilters = updater(columnFilters);
			} else {
				columnFilters = updater;
			}
		},
		onColumnVisibilityChange: (updater) => {
			if (typeof updater === 'function') {
				visibleColumns = updater(visibleColumns as VisibilityState) as Record<TableColumnId, boolean>;
			} else {
				visibleColumns = updater as Record<TableColumnId, boolean>;
			}
			onColumnVisibilityPersist?.();
		},
		onRowSelectionChange: (updater) => {
			if (typeof updater === 'function') {
				rowSelection = updater(rowSelection);
			} else {
				rowSelection = updater;
			}
		}
	});

	function rowActivateClick(e: MouseEvent, p: Place) {
		const el = e.target as HTMLElement | null;
		if (
			el?.closest(
				'button, a, input, textarea, select, [data-slot=checkbox], [data-slot=input], [role=checkbox]'
			)
		)
			return;
		onSelectPlace(p);
	}
</script>

<div class="flex w-full min-w-0 flex-col">
	<Table.Root class="min-w-0">
		<Table.Header>
			{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
				<Table.Row class="hover:bg-transparent">
					{#each headerGroup.headers as header (header.id)}
						<Table.Head
							colspan={header.colSpan}
							class="bg-card [&:has([role=checkbox])]:ps-3 border-border sticky top-0 z-[1] border-b font-semibold"
						>
							{#if !header.isPlaceholder}
								<FlexRender
									content={header.column.columnDef.header}
									context={header.getContext()}
								/>
							{/if}
						</Table.Head>
					{/each}
					</Table.Row>
				{/each}
			</Table.Header>
			<Table.Body>
				{#each table.getRowModel().rows as row (row.id)}
					<Table.Row
						data-state={row.getIsSelected() || selectedId === row.original.id
							? 'selected'
							: undefined}
						class={cn(
							'hover:bg-muted/50 cursor-pointer',
							selectedId === row.original.id && 'bg-primary/10'
						)}
						onclick={(e) => rowActivateClick(e, row.original)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								const t = e.target as HTMLElement | null;
								if (
									t?.closest(
										'button, a, input, textarea, select, [data-slot=checkbox], [data-slot=input], [role=checkbox]'
									)
								)
									return;
								onSelectPlace(row.original);
							}
						}}
						tabindex={0}
						role="button"
					>
						{#each row.getVisibleCells() as cell (cell.id)}
							<Table.Cell
								class={cn(
									'[&:has([role=checkbox])]:ps-3 max-w-72 align-middle',
									cell.column.id !== 'screenshot' &&
										cell.column.id !== 'interested' &&
										'min-w-0 truncate'
								)}
							>
								<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
							</Table.Cell>
						{/each}
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={columns.length} class="h-24 text-center">
							No results.
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	<div
		class="text-muted-foreground border-t border-border px-5 pt-4 text-sm"
		aria-live="polite"
	>
		{table.getFilteredSelectedRowModel().rows.length} of
		{table.getFilteredRowModel().rows.length} row(s) selected.
	</div>
</div>
