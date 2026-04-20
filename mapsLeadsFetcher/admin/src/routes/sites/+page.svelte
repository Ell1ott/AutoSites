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
</script>

<div class="flex flex-1 flex-col gap-4 p-4">
	<Card>
		<CardHeader>
			<CardTitle>Sites</CardTitle>
			<CardDescription>Manage and browse sites connected to your leads.</CardDescription>
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
