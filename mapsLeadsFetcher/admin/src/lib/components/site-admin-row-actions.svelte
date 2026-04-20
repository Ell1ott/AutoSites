<script lang="ts">
	import { browser } from '$app/environment';
	import { deserialize } from '$app/forms';
	import type { SiteAdminRow } from '$lib/sites.types';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { MoreHorizontalIcon } from '@hugeicons/core-free-icons';

	let { siteId, admin }: { siteId: string; admin: SiteAdminRow } = $props();

	let open = $state(false);
	let pending = $state(false);

	async function onCreateLoginLink() {
		if (!browser || pending) return;
		if (!admin.email) return;

		pending = true;
		try {
			const body = new FormData();
			body.set('userId', admin.user_id);
			const res = await fetch(`/sites/${encodeURIComponent(siteId)}?/adminLoginLink`, {
				method: 'POST',
				body
			});
			const result = deserialize(await res.text());

			if (result.type === 'success' && result.data && 'loginLink' in result.data) {
				const link = String(result.data.loginLink ?? '');
				if (link) {
					await navigator.clipboard.writeText(link);
				}
				open = false;
				return;
			}

			if (result.type === 'failure' && result.data && typeof result.data === 'object') {
				const msg =
					'message' in result.data && typeof (result.data as { message?: unknown }).message === 'string'
						? (result.data as { message: string }).message
						: 'Could not create login link';
				alert(msg);
				return;
			}

			alert('Could not create login link');
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Request failed');
		} finally {
			pending = false;
		}
	}
</script>

<div
	class="flex justify-end"
	role="group"
	aria-label="Row actions"
	onpointerdown={(e) => e.stopPropagation()}
>
	<DropdownMenu.Root bind:open>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button
					{...props}
					variant="ghost"
					size="icon-sm"
					class="text-muted-foreground hover:text-foreground size-8"
					aria-label="Admin actions for {admin.email ?? admin.user_id}"
					disabled={pending}
				>
					<HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" class="min-w-48">
			<DropdownMenu.Item
				disabled={!admin.email || pending}
				onclick={() => {
					void onCreateLoginLink();
				}}
			>
				Create login link
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
