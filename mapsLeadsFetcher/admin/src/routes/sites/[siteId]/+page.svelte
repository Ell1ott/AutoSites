<script lang="ts">
	import type { PageData } from './$types';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import SiteAdminsDataTable from '$lib/components/site-admins-data-table.svelte';
	import type { CmsContentRow } from '$lib/sites.types';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

	let { data }: { data: PageData } = $props();

	function formatUpdated(iso: string): string {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return iso;
		return d.toLocaleString(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		});
	}

	function valuePreview(row: CmsContentRow): string {
		try {
			return JSON.stringify(row.value, null, 2);
		} catch {
			return String(row.value);
		}
	}
</script>

<div class="flex flex-1 flex-col gap-6 p-4">
	<header class="flex items-center gap-1">
		<Button
			href="/sites"
			variant="ghost"
			size="icon-sm"
			class="text-muted-foreground hover:text-foreground shrink-0"
			aria-label="Back to sites"
		>
			<HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" strokeWidth={2} />
		</Button>
		<h1 class="text-xl leading-none font-semibold tracking-tight">{data.site.name}</h1>
	</header>

	<div class="grid gap-6 lg:grid-cols-2">
		<Card class="flex min-h-[280px] flex-col">
			<CardHeader>
				<CardTitle class="text-base">Admins</CardTitle>
			</CardHeader>
			<CardContent class="flex-1 pt-0">
				<SiteAdminsDataTable siteId={data.site.id} admins={data.admins} />
			</CardContent>
		</Card>

		<Card class="flex min-h-[200px] flex-col">
			<CardHeader class="pb-2">
				<CardTitle class="text-base">Events</CardTitle>
			</CardHeader>
			<CardContent class="flex flex-1 flex-col justify-center pt-0">
				<p class="text-muted-foreground text-center text-sm">No events yet.</p>
			</CardContent>
		</Card>
	</div>

	<Card>
		<CardHeader class="pb-2">
			<CardTitle>Content keys</CardTitle>
		</CardHeader>
		<CardContent>
			{#if data.cmsContent.length === 0}
				<p class="text-muted-foreground text-sm">No content keys yet.</p>
			{:else}
				<div class="border-border max-h-[min(70vh,720px)] overflow-auto rounded-md border">
					<Table.Root>
						<Table.Header>
							<Table.Row class="hover:bg-transparent">
								<Table.Head class="bg-card sticky top-0 z-[1] w-[22%] font-semibold">Key</Table.Head>
								<Table.Head class="bg-card sticky top-0 z-[1] w-[8%] font-semibold">Kind</Table.Head>
								<Table.Head class="bg-card sticky top-0 z-[1] font-semibold">Value</Table.Head>
								<Table.Head class="bg-card sticky top-0 z-[1] w-[14%] font-semibold">Updated</Table.Head>
								<Table.Head class="bg-card sticky top-0 z-[1] w-[18%] font-semibold">Updated by</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.cmsContent as row (row.key)}
								<Table.Row>
									<Table.Cell class="align-top font-mono text-xs break-all">{row.key}</Table.Cell>
									<Table.Cell class="align-top">
										<span class="bg-muted rounded-md px-1.5 py-0.5 text-xs font-medium">
											{row.kind}
										</span>
									</Table.Cell>
									<Table.Cell class="align-top">
										<pre
											class="text-muted-foreground max-h-40 overflow-auto font-mono text-xs whitespace-pre-wrap break-all"
										>{valuePreview(row)}</pre>
									</Table.Cell>
									<Table.Cell class="text-muted-foreground align-top text-xs whitespace-nowrap">
										{formatUpdated(row.updated_at)}
									</Table.Cell>
									<Table.Cell class="text-muted-foreground align-top font-mono text-xs break-all">
										{row.updated_by ?? '—'}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
