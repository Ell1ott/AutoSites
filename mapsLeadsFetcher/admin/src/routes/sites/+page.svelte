<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
</script>

<div class="flex flex-1 flex-col gap-4 p-4">
	<Card>
		<CardHeader>
			<CardTitle>Sites</CardTitle>
			<CardDescription>Manage and browse sites connected to your leads.</CardDescription>
		</CardHeader>
		<CardContent>
			<p class="text-muted-foreground text-sm">No sites data yet.</p>
		</CardContent>
	</Card>
</div>
