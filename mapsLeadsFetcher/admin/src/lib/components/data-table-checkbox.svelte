<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';

	let {
		checked,
		indeterminate = false,
		onCheckedChange,
		'aria-label': ariaLabel
	}: {
		checked: boolean;
		indeterminate?: boolean;
		onCheckedChange: (value: boolean) => void;
		'aria-label'?: string;
	} = $props();
</script>

<Checkbox
	{checked}
	{indeterminate}
	aria-label={ariaLabel}
	onCheckedChange={(v) => onCheckedChange(v === true)}
/>
