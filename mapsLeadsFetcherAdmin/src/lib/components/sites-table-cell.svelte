<script lang="ts">
	import type { SiteRow } from '$lib/sites.types';
	import type { SitesTableColumnId } from '$lib/sitesTableColumns';

	let { site, colId }: { site: SiteRow; colId: SitesTableColumnId } = $props();

	function formatCreated(iso: string): string {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return iso;
		return d.toLocaleString(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		});
	}
</script>

{#if colId === 'name'}
	<a
		href="/sites/{site.id}"
		class="text-primary block min-w-0 truncate font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
	>
		{site.name}
	</a>
{:else if colId === 'slug'}
	<span class="text-muted-foreground block min-w-0 truncate font-mono text-xs">{site.slug}</span>
{:else if colId === 'created_at'}
	<span class="text-muted-foreground text-xs">{formatCreated(site.created_at)}</span>
{/if}
