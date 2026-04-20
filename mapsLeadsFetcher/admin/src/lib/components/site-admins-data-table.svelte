<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import {
		type RowSelectionState,
		type SortingState,
		getCoreRowModel,
		getSortedRowModel
	} from '@tanstack/table-core';
	import type { SiteAdminRow } from '$lib/sites.types';
	import { cn } from '$lib/utils.js';
	import {
		createSvelteTable,
		FlexRender,
		renderComponent
	} from '$lib/components/ui/data-table/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import DataTableCheckbox from '$lib/components/data-table-checkbox.svelte';
	import SortableColumnHeader from '$lib/components/lead-overview-column-header.svelte';
	import SiteAdminRowActions from '$lib/components/site-admin-row-actions.svelte';

	let { admins, siteId }: { admins: SiteAdminRow[]; siteId: string } = $props();

	let sorting = $state<SortingState>([]);
	let rowSelection = $state<RowSelectionState>({});

	function formatCreated(iso: string): string {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return iso;
		return d.toLocaleString(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		});
	}

	const columns: ColumnDef<SiteAdminRow>[] = [
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
		{
			id: 'email',
			accessorFn: (row) => row.email ?? '',
			header: ({ column }) =>
				renderComponent(SortableColumnHeader, {
					label: 'Email',
					onToggleSort: column.getToggleSortingHandler() ?? (() => {}),
					sortState: column.getIsSorted()
				}),
			enableSorting: true,
			cell: ({ row }) => row.original.email ?? 'Unknown user'
		},
		{
			id: 'user_id',
			accessorKey: 'user_id',
			header: ({ column }) =>
				renderComponent(SortableColumnHeader, {
					label: 'User ID',
					onToggleSort: column.getToggleSortingHandler() ?? (() => {}),
					sortState: column.getIsSorted()
				}),
			enableSorting: true,
			cell: () => ''
		},
		{
			id: 'created_at',
			accessorFn: (row) => new Date(row.created_at).getTime() || 0,
			header: ({ column }) =>
				renderComponent(SortableColumnHeader, {
					label: 'Added',
					onToggleSort: column.getToggleSortingHandler() ?? (() => {}),
					sortState: column.getIsSorted()
				}),
			enableSorting: true,
			cell: ({ row }) => formatCreated(row.original.created_at)
		},
		{
			id: 'actions',
			header: () => '',
			enableSorting: false,
			cell: ({ row }) =>
				renderComponent(SiteAdminRowActions, { siteId, admin: row.original })
		}
	];

	const table = createSvelteTable({
		get data() {
			return admins;
		},
		columns,
		getRowId: (row) => row.user_id,
		state: {
			get sorting() {
				return sorting;
			},
			get rowSelection() {
				return rowSelection;
			}
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: (updater) => {
			sorting = typeof updater === 'function' ? updater(sorting) : updater;
		},
		onRowSelectionChange: (updater) => {
			rowSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
		}
	});
</script>

<div class="w-full">
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
									header.column.id === 'actions' && 'w-12 pe-2',
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
									'[&:has([role=checkbox])]:ps-3 max-w-72 align-middle whitespace-normal',
									ri === table.getRowModel().rows.length - 1 && ci === 0 && 'rounded-bl-md',
									ri === table.getRowModel().rows.length - 1 &&
										ci === row.getVisibleCells().length - 1 &&
										'rounded-br-md',
									cell.column.id === 'user_id' && 'max-w-md font-mono text-xs',
									cell.column.id === 'actions' && 'w-12 p-0 pe-2'
								)}
							>
								{#if cell.column.id === 'user_id'}
									<span class="text-muted-foreground font-mono text-xs break-all">
										{row.original.user_id}
									</span>
								{:else}
									<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
								{/if}
							</Table.Cell>
						{/each}
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={columns.length} class="h-24 rounded-b-md text-center">
							No admins for this site.
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>
