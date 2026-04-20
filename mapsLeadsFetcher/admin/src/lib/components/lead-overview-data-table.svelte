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
	import type { Place } from '$lib/places.types';
	import {
		TABLE_COLUMNS,
		defaultVisibleColumns,
		type TableColumnId
	} from '$lib/leadoverviewTableColumns';
	import { placeTitle } from '$lib/places';
	import { cn } from '$lib/utils.js';
	import {
		createSvelteTable,
		FlexRender,
		renderComponent
	} from '$lib/components/ui/data-table/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
	import DataTableCheckbox from '$lib/components/data-table-checkbox.svelte';
	import LeadOverviewColumnHeader from '$lib/components/lead-overview-column-header.svelte';
	import LeadOverviewTableCell from '$lib/components/lead-overview-table-cell.svelte';

	type LeadOverviewMeta = {
		failedScreenshots: Record<string, boolean>;
		onImgError: (id: string) => void;
		onExpandScreenshot: (p: Place) => void;
	};

	const SORTABLE: TableColumnId[] = [
		'name',
		'added',
		'type',
		'address',
		'phone',
		'rating',
		'status',
		'open_now',
		'price'
	];

	function sortValue(colId: TableColumnId, p: Place): string | number {
		switch (colId) {
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
		onSelectPlace,
		onImgError,
		onExpandScreenshot,
		onColumnVisibilityPersist
	}: {
		places: Place[];
		visibleColumns: Record<TableColumnId, boolean>;
		selectedId: string | null;
		failedScreenshots: Record<string, boolean>;
		onSelectPlace: (p: Place) => void;
		onImgError: (id: string) => void;
		onExpandScreenshot: (p: Place) => void;
		onColumnVisibilityPersist?: () => void;
	} = $props();

	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
	let sorting = $state<SortingState>([]);
	let columnFilters = $state<ColumnFiltersState>([]);
	let rowSelection = $state<RowSelectionState>({});

	const columns: ColumnDef<Place>[] = [
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
				accessorFn: (row) => sortValue(col.id, row),
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
						onImgError: () => meta.onImgError(row.original.id),
						onExpandScreenshot: () => meta.onExpandScreenshot(row.original)
					});
				}
			};
		})
	];

	const table = createSvelteTable({
		get data() {
			return places;
		},
		columns,
		getRowId: (row) => row.id,
		get meta(): LeadOverviewMeta {
			return {
				failedScreenshots,
				onImgError,
				onExpandScreenshot
			};
		},
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

	function selectAllColumnsFn() {
		const next = { ...visibleColumns };
		for (const c of TABLE_COLUMNS) next[c.id] = true;
		visibleColumns = next;
		onColumnVisibilityPersist?.();
	}

	function clearAllColumnsFn() {
		const next = { ...visibleColumns };
		for (const c of TABLE_COLUMNS) next[c.id] = false;
		visibleColumns = next;
		onColumnVisibilityPersist?.();
	}

	function resetColumnDefaultsFn() {
		visibleColumns = defaultVisibleColumns();
		onColumnVisibilityPersist?.();
	}

	function rowActivateClick(e: MouseEvent, p: Place) {
		const el = e.target as HTMLElement | null;
		if (el?.closest('button, a, [data-slot=checkbox], [role=checkbox]')) return;
		onSelectPlace(p);
	}
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
		<div class="ms-auto">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline">
						Columns
						<HugeiconsIcon icon={ArrowDown01Icon} data-icon="inline-end" strokeWidth={2} />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content class="w-56" align="end">
				<DropdownMenu.Label>Column visibility</DropdownMenu.Label>
				<DropdownMenu.Item onclick={selectAllColumnsFn}>Select all</DropdownMenu.Item>
				<DropdownMenu.Item onclick={clearAllColumnsFn}>Clear</DropdownMenu.Item>
				<DropdownMenu.Item onclick={resetColumnDefaultsFn}>Defaults</DropdownMenu.Item>
				<DropdownMenu.Separator />
				{#each table.getAllColumns().filter((col) => col.getCanHide()) as column (column.id)}
					{@const colDef = TABLE_COLUMNS.find((c) => c.id === column.id)}
					<DropdownMenu.CheckboxItem
						closeOnSelect={false}
						bind:checked={
							() => column.getIsVisible(), (v) => column.toggleVisibility(!!v)
						}
					>
						{colDef?.label ?? column.id}
					</DropdownMenu.CheckboxItem>
				{/each}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
		</div>
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
								if (t?.closest('button, a, [data-slot=checkbox], [role=checkbox]')) return;
								onSelectPlace(row.original);
							}
						}}
						tabindex={0}
						role="button"
					>
						{#each row.getVisibleCells() as cell, ci (cell.id)}
							<Table.Cell
								class={cn(
									'[&:has([role=checkbox])]:ps-3 max-w-72 align-middle',
									cell.column.id !== 'screenshot' && 'whitespace-normal',
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
