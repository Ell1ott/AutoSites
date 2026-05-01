<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
	import SitesDataTable from '$lib/components/sites-data-table.svelte';
	import {
		SITES_TABLE_COLUMNS,
		defaultSitesVisibleColumns,
		type SitesTableColumnId
	} from '$lib/sitesTableColumns';

	let { data }: { data: PageData } = $props();

	const COLS_STORAGE_KEY = 'sites.tableColumns';

	let visibleColumns = $state<Record<SitesTableColumnId, boolean>>(defaultSitesVisibleColumns());

	onMount(() => {
		const raw = localStorage.getItem(COLS_STORAGE_KEY);
		if (raw) {
			try {
				const parsed = JSON.parse(raw) as Record<string, boolean>;
				const next = { ...visibleColumns };
				for (const c of SITES_TABLE_COLUMNS) {
					if (typeof parsed[c.id] === 'boolean') {
						next[c.id] = parsed[c.id];
					}
				}
				visibleColumns = next;
			} catch {
				/* ignore */
			}
		}
	});

	function persistColumns() {
		if (browser) localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify(visibleColumns));
	}

	function selectAllSiteColumns() {
		const next = { ...visibleColumns };
		for (const c of SITES_TABLE_COLUMNS) next[c.id] = true;
		visibleColumns = next;
		persistColumns();
	}

	function clearSiteColumns() {
		const next = { ...visibleColumns };
		for (const c of SITES_TABLE_COLUMNS) next[c.id] = false;
		visibleColumns = next;
		persistColumns();
	}

	function resetSiteColumnDefaults() {
		visibleColumns = defaultSitesVisibleColumns();
		persistColumns();
	}
</script>

<div class="flex flex-1 flex-col gap-4 p-4">
	<Card>
		<CardHeader class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="min-w-0 space-y-1.5">
				<CardTitle>Sites</CardTitle>
				<CardDescription>Manage and browse sites connected to your leads.</CardDescription>
			</div>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="sm" class="h-8 shrink-0 gap-1.5">
							Columns
							<HugeiconsIcon
								icon={ArrowDown01Icon}
								data-icon="inline-end"
								strokeWidth={2}
							/>
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content class="w-56" align="end">
					<DropdownMenu.Label>Column visibility</DropdownMenu.Label>
					<DropdownMenu.Item onclick={selectAllSiteColumns}>Select all</DropdownMenu.Item>
					<DropdownMenu.Item onclick={clearSiteColumns}>Clear</DropdownMenu.Item>
					<DropdownMenu.Item onclick={resetSiteColumnDefaults}>Defaults</DropdownMenu.Item>
					<DropdownMenu.Separator />
					{#each SITES_TABLE_COLUMNS as col (col.id)}
						<DropdownMenu.CheckboxItem
							closeOnSelect={false}
							bind:checked={
								() => visibleColumns[col.id],
								(v) => {
									visibleColumns = { ...visibleColumns, [col.id]: v };
									persistColumns();
								}
							}
						>
							{col.label}
						</DropdownMenu.CheckboxItem>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</CardHeader>
		<CardContent>
			{#if data.sites.length === 0}
				<p class="text-muted-foreground text-sm">No sites yet.</p>
			{:else}
				<SitesDataTable
					sites={data.sites}
					bind:visibleColumns
					onColumnVisibilityPersist={persistColumns}
				/>
			{/if}
		</CardContent>
	</Card>
</div>
