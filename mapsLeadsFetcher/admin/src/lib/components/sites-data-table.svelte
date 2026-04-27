<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import {
		type ColumnFiltersState,
		type PaginationState,
		type RowSelectionState,
		type SortingState,
		type VisibilityState,
		getCoreRowModel,
		getFilteredRowModel,
		getPaginationRowModel,
		getSortedRowModel
	} from '@tanstack/table-core';
	import type { SiteRow } from '$lib/sites.types';
	import { SITES_TABLE_COLUMNS, type SitesTableColumnId } from '$lib/sitesTableColumns';
	import { cn } from '$lib/utils.js';
	import {
		createSvelteTable,
		FlexRender,
		renderComponent
	} from '$lib/components/ui/data-table/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import DataTableCheckbox from '$lib/components/data-table-checkbox.svelte';
	import SortableColumnHeader from '$lib/components/lead-overview-column-header.svelte';
	import SitesTableCell from '$lib/components/sites-table-cell.svelte';

	const SORTABLE: SitesTableColumnId[] = ['name', 'slug', 'created_at'];

	function sortValue(colId: SitesTableColumnId, s: SiteRow): string | number {
		switch (colId) {
			case 'name':
				return s.name;
			case 'slug':
				return s.slug;
			case 'created_at':
				return new Date(s.created_at).getTime() || 0;
			default:
				return '';
		}
	}

	let {
		sites,
		visibleColumns = $bindable(),
		onColumnVisibilityPersist
	}: {
		sites: SiteRow[];
		visibleColumns: Record<SitesTableColumnId, boolean>;
		onColumnVisibilityPersist?: () => void;
	} = $props();

	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 30 });
	let sorting = $state<SortingState>([]);
	let columnFilters = $state<ColumnFiltersState>([]);
	let rowSelection = $state<RowSelectionState>({});

	const columns: ColumnDef<SiteRow>[] = [
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
		...SITES_TABLE_COLUMNS.map((col): ColumnDef<SiteRow> => {
			const sortable = SORTABLE.includes(col.id);
			return {
				id: col.id,
				accessorFn: (row) => sortValue(col.id, row),
				header: sortable
					? ({ column }) =>
							renderComponent(SortableColumnHeader, {
								label: col.label,
								onToggleSort: column.getToggleSortingHandler() ?? (() => {}),
								sortState: column.getIsSorted()
							})
					: col.label,
				enableSorting: sortable,
				enableHiding: true,
				cell: ({ row }) =>
					renderComponent(SitesTableCell, {
						site: row.original,
						colId: col.id
					})
			};
		})
	];

	const table = createSvelteTable({
		get data() {
			return sites;
		},
		columns,
		getRowId: (row) => row.id,
		state: {
			get pagination() {
				return pagination;
			},
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
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onPaginationChange: (updater) => {
			if (typeof updater === 'function') {
				pagination = updater(pagination);
			} else {
				pagination = updater;
			}
		},
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
				visibleColumns = updater(visibleColumns as VisibilityState) as Record<
					SitesTableColumnId,
					boolean
				>;
			} else {
				visibleColumns = updater as Record<SitesTableColumnId, boolean>;
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
</script>

<div class="-mb-8 w-full">
	<div class="flex flex-wrap items-center gap-3 py-4">
		<Input
			placeholder="Filter by name..."
			value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
			oninput={(e) => table.getColumn('name')?.setFilterValue(e.currentTarget.value)}
			onchange={(e) => table.getColumn('name')?.setFilterValue(e.currentTarget.value)}
			class="max-w-sm"
		/>
	</div>
	<div class="border-border overflow-hidden rounded-md border">
		<Table.Root>
			<Table.Header>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<Table.Row class="hover:bg-transparent">
						{#each headerGroup.headers as header, hi (header.id)}
							<Table.Head
								colspan={header.colSpan}
								class={cn(
									'bg-card [&:has([role=checkbox])]:ps-3 border-border sticky top-0 z-[1] border-b font-semibold',
									hi === 0 && 'rounded-tl-md',
									hi === headerGroup.headers.length - 1 && 'rounded-tr-md'
								)}
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
				{#each table.getRowModel().rows as row, ri (row.id)}
					<Table.Row data-state={row.getIsSelected() ? 'selected' : undefined}>
						{#each row.getVisibleCells() as cell, ci (cell.id)}
							<Table.Cell
								class={cn(
									'[&:has([role=checkbox])]:ps-3 max-w-72 min-w-0 align-middle truncate',
									ri === table.getRowModel().rows.length - 1 && ci === 0 && 'rounded-bl-md',
									ri === table.getRowModel().rows.length - 1 &&
										ci === row.getVisibleCells().length - 1 &&
										'rounded-br-md'
								)}
							>
								<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
							</Table.Cell>
						{/each}
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={columns.length} class="h-24 rounded-b-md text-center">
							No results.
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
	<div class="flex flex-col items-stretch gap-3 pt-4 sm:flex-row sm:items-center sm:justify-end">
		<div class="text-muted-foreground text-sm">
			{table.getFilteredSelectedRowModel().rows.length} of
			{table.getFilteredRowModel().rows.length} row(s) selected.
		</div>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={() => table.previousPage()}
				disabled={!table.getCanPreviousPage()}
			>
				Previous
			</Button>
			<Button
				variant="outline"
				size="sm"
				onclick={() => table.nextPage()}
				disabled={!table.getCanNextPage()}
			>
				Next
			</Button>
		</div>
	</div>
</div>
