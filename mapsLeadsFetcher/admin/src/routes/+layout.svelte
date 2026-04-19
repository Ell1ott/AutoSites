<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowDown01Icon } from '@hugeicons/core-free-icons';

	let { children } = $props();

	const nav = [
		{ href: '/leadoverview', label: 'Lead overview' },
		{ href: '/sites', label: 'Sites' }
	] as const;

	const currentLabel = $derived(
		nav.find((item) => page.url.pathname === item.href)?.label ?? 'Lead overview'
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="bg-background flex min-h-svh flex-col">
	<header
		class="border-border bg-background/95 supports-backdrop-filter:bg-background/80 flex h-14 shrink-0 items-center border-b px-4 backdrop-blur"
	>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" size="sm" class="text-foreground font-semibold">
						{currentLabel}
						<HugeiconsIcon icon={ArrowDown01Icon} data-icon="inline-end" strokeWidth={2} />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start" class="w-56">
				<DropdownMenu.Group>
					{#each nav as item (item.href)}
						<DropdownMenu.Item
							onclick={() => {
								void goto(item.href);
							}}
						>
							{item.label}
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Group>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</header>
	<main class="flex min-h-0 flex-1 flex-col">
		{@render children()}
	</main>
</div>
