<script lang="ts">
	import type { Column } from '@tanstack/table-core';
	import type { Place } from '$lib/places.types';
	import { Button } from '$lib/components/ui/button/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ArrowDown01Icon,
		ArrowUp01Icon,
		ArrowUpDownIcon
	} from '@hugeicons/core-free-icons';

	let {
		column,
		label
	}: {
		column: Column<Place, unknown>;
		label: string;
	} = $props();
</script>

<Button variant="ghost" size="sm" class="-ms-2 h-8 px-2" onclick={column.getToggleSortingHandler()}>
	<span>{label}</span>
	{#if column.getIsSorted() === 'asc'}
		<HugeiconsIcon icon={ArrowUp01Icon} data-icon="inline-end" strokeWidth={2} />
	{:else if column.getIsSorted() === 'desc'}
		<HugeiconsIcon icon={ArrowDown01Icon} data-icon="inline-end" strokeWidth={2} />
	{:else}
		<HugeiconsIcon
			icon={ArrowUpDownIcon}
			data-icon="inline-end"
			class="text-muted-foreground opacity-50"
			strokeWidth={2}
		/>
	{/if}
</Button>
