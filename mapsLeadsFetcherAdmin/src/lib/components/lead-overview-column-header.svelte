<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ArrowDown01Icon,
		ArrowUp01Icon,
		ArrowUpDownIcon
	} from '@hugeicons/core-free-icons';

	let {
		label,
		onToggleSort,
		sortState
	}: {
		label: string;
		onToggleSort: (e: unknown) => void;
		sortState: false | 'asc' | 'desc';
	} = $props();
</script>

<Button variant="ghost" size="sm" class="-ms-2 h-8 px-2" onclick={onToggleSort}>
	<span>{label}</span>
	{#if sortState === 'asc'}
		<HugeiconsIcon icon={ArrowUp01Icon} data-icon="inline-end" strokeWidth={2} />
	{:else if sortState === 'desc'}
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
