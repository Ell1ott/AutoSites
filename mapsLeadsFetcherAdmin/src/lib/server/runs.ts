import { readFile } from 'node:fs/promises';
import { runsJsonPath } from '$lib/repoPaths';
import type { AiTaskSettings, RunEntry, RunsFile, RunSummary } from '$lib/ai.types';

async function readRunsFile(): Promise<RunsFile> {
	try {
		const raw = await readFile(runsJsonPath, 'utf-8');
		const parsed = JSON.parse(raw) as RunsFile;
		if (!parsed || !Array.isArray(parsed.runs)) return { runs: [] };
		return parsed;
	} catch (err: unknown) {
		if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return { runs: [] };
		throw err;
	}
}

function snapshotSummary(snap: RunEntry['settings_snapshot']): RunSummary['settings_snapshot'] {
	const full = snap as Partial<AiTaskSettings> | undefined;
	return {
		model: snap?.model ?? '',
		label: typeof full?.label === 'string' ? full.label : undefined,
		output_field: typeof full?.output_field === 'string' ? full.output_field : undefined
	};
}

export async function listRunSummaries(): Promise<RunSummary[]> {
	const { runs } = await readRunsFile();
	return runs
		.map((r) => ({
			id: r.id,
			started_at: r.started_at,
			finished_at: r.finished_at,
			tool: r.tool,
			task_id: r.tool,
			status: r.status,
			scope: r.scope,
			counts: r.counts,
			settings_snapshot: snapshotSummary(r.settings_snapshot)
		}))
		.sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
}

export async function getRun(id: string): Promise<RunEntry | null> {
	const { runs } = await readRunsFile();
	return runs.find((r) => r.id === id) ?? null;
}
