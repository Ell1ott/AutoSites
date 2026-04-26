<script lang="ts">
	import { browser } from '$app/environment';
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	let { siteId, open = $bindable(false) }: { siteId: string; open?: boolean } = $props();

	let email = $state('');
	let pending = $state(false);
	let errorMessage = $state<string | null>(null);

	$effect(() => {
		if (!open) {
			email = '';
			errorMessage = null;
			pending = false;
		}
	});

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!browser || pending) return;

		const trimmed = email.trim();
		if (!trimmed) {
			errorMessage = 'Email is required';
			return;
		}

		pending = true;
		errorMessage = null;
		try {
			const body = new FormData();
			body.set('email', trimmed);
			const res = await fetch(`/sites/${encodeURIComponent(siteId)}?/addAdmin`, {
				method: 'POST',
				body
			});
			const result = deserialize(await res.text());

			if (result.type === 'success') {
				open = false;
				await invalidateAll();
				return;
			}

			if (result.type === 'failure' && result.data && typeof result.data === 'object') {
				const msg =
					'message' in result.data &&
					typeof (result.data as { message?: unknown }).message === 'string'
						? (result.data as { message: string }).message
						: 'Could not add admin';
				errorMessage = msg;
				return;
			}

			errorMessage = 'Could not add admin';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Request failed';
		} finally {
			pending = false;
		}
	}
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>Add admin</DialogTitle>
			<DialogDescription>
				Grant a user access to manage this site. If no account exists for the email, one will be
				created.
			</DialogDescription>
		</DialogHeader>

		<form onsubmit={onSubmit} class="grid gap-4">
			<div class="grid gap-2">
				<Label for="add-admin-email">Email</Label>
				<Input
					id="add-admin-email"
					type="email"
					autocomplete="email"
					placeholder="user@example.com"
					required
					disabled={pending}
					bind:value={email}
				/>
			</div>

			{#if errorMessage}
				<p class="text-destructive text-sm">{errorMessage}</p>
			{/if}

			<DialogFooter>
				<Button
					type="button"
					variant="ghost"
					disabled={pending}
					onclick={() => {
						open = false;
					}}
				>
					Cancel
				</Button>
				<Button type="submit" disabled={pending}>
					{pending ? 'Adding…' : 'Add admin'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
