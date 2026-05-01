import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { spawn } from 'node:child_process';
import { mapsLeadsFetcherRoot } from '$lib/repoPaths';
import { readSettings } from '$lib/server/settings';

interface RunRequestBody {
	mode?: unknown;
	placeIds?: unknown;
	limit?: unknown;
	taskId?: unknown;
	concurrency?: unknown;
}

const MAX_LIMIT = 500;
const DEFAULT_WORKERS = 4;
const MIN_WORKERS = 1;
const MAX_WORKERS = 32;

function makeRunId(): string {
	const iso = new Date().toISOString().replace(/[:.]/g, '-').replace(/Z$/, 'Z');
	const rand = Math.random().toString(16).slice(2, 8);
	return `${iso}-${rand}`;
}

function sseEncode(dataObj: unknown, event?: string): string {
	const data = JSON.stringify(dataObj);
	const head = event ? `event: ${event}\n` : '';
	return `${head}data: ${data}\n\n`;
}

export const POST: RequestHandler = async ({ request }) => {
	let body: RunRequestBody;
	try {
		body = (await request.json()) as RunRequestBody;
	} catch {
		error(400, 'Body must be valid JSON');
	}

	const mode = body.mode;
	if (mode !== 'all-new' && mode !== 'pick' && mode !== 'limit') {
		error(400, "mode must be 'all-new' | 'pick' | 'limit'");
	}

	const taskIdRaw = body.taskId;
	if (typeof taskIdRaw !== 'string' || !taskIdRaw.trim()) {
		error(400, 'taskId must be a non-empty string');
	}
	const taskId = taskIdRaw.trim();
	const aiSettings = await readSettings();
	if (!(taskId in aiSettings.ai_tasks)) {
		error(400, `Unknown taskId: ${taskId}`);
	}

	let workers = DEFAULT_WORKERS;
	if (body.concurrency !== undefined && body.concurrency !== null) {
		const w = body.concurrency;
		if (typeof w !== 'number' || !Number.isInteger(w) || w < MIN_WORKERS || w > MAX_WORKERS) {
			error(
				400,
				`concurrency must be an integer between ${MIN_WORKERS} and ${MAX_WORKERS}`
			);
		}
		workers = w;
	}

	const args: string[] = [
		'run',
		'generate_design_prompts.py',
		'--json-events',
		'--task',
		taskId,
		'--workers',
		String(workers)
	];

	if (mode === 'pick') {
		if (
			!Array.isArray(body.placeIds) ||
			body.placeIds.length === 0 ||
			!body.placeIds.every((x) => typeof x === 'string' && x.trim().length > 0)
		) {
			error(400, 'placeIds must be a non-empty array of strings when mode is pick');
		}
		const ids = (body.placeIds as string[]).map((s) => s.trim());
		if (ids.some((s) => s.includes(','))) {
			error(400, 'place ids must not contain commas');
		}
		args.push('--place-ids', ids.join(','));
	} else if (mode === 'limit') {
		const lim = body.limit;
		if (typeof lim !== 'number' || !Number.isInteger(lim) || lim < 1 || lim > MAX_LIMIT) {
			error(400, `limit must be an integer between 1 and ${MAX_LIMIT}`);
		}
		args.push('--limit', String(lim));
	}

	const runId = makeRunId();
	args.push('--run-id', runId);

	const child = spawn('uv', args, {
		cwd: mapsLeadsFetcherRoot,
		env: process.env,
		stdio: ['ignore', 'pipe', 'pipe']
	});

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			const encoder = new TextEncoder();
			let stdoutBuffer = '';
			let closed = false;
			let heartbeat: ReturnType<typeof setInterval> | undefined;

			const send = (chunk: string) => {
				if (closed) return;
				try {
					controller.enqueue(encoder.encode(chunk));
				} catch {
					/* stream closed */
				}
			};

			const close = () => {
				if (closed) return;
				closed = true;
				if (heartbeat) clearInterval(heartbeat);
				try {
					controller.close();
				} catch {
					/* already closed */
				}
			};

			send(sseEncode({ type: 'connected', runId }, 'connected'));

			heartbeat = setInterval(() => {
				send(`: heartbeat ${Date.now()}\n\n`);
			}, 15_000);

			child.stdout.setEncoding('utf-8');
			child.stdout.on('data', (data: string) => {
				stdoutBuffer += data;
				let idx = stdoutBuffer.indexOf('\n');
				while (idx !== -1) {
					const line = stdoutBuffer.slice(0, idx).trim();
					stdoutBuffer = stdoutBuffer.slice(idx + 1);
					if (line) {
						try {
							const parsed = JSON.parse(line) as { type?: string };
							const eventName =
								typeof parsed.type === 'string' ? parsed.type : 'message';
							send(sseEncode(parsed, eventName));
						} catch {
							send(sseEncode({ type: 'raw', line }, 'raw'));
						}
					}
					idx = stdoutBuffer.indexOf('\n');
				}
			});

			let stderrTail = '';
			child.stderr.setEncoding('utf-8');
			child.stderr.on('data', (data: string) => {
				stderrTail = (stderrTail + data).slice(-4000);
				for (const line of data.split('\n')) {
					const trimmed = line.trim();
					if (trimmed) send(sseEncode({ type: 'log', line: trimmed }, 'log'));
				}
			});

			child.on('error', (err) => {
				send(
					sseEncode(
						{ type: 'spawn_error', error: `${err.name}: ${err.message}` },
						'spawn_error'
					)
				);
				close();
			});

			child.on('close', (code) => {
				if (stdoutBuffer.trim()) {
					try {
						const parsed = JSON.parse(stdoutBuffer.trim()) as { type?: string };
						const eventName =
							typeof parsed.type === 'string' ? parsed.type : 'message';
						send(sseEncode(parsed, eventName));
					} catch {
						/* ignore trailing garbage */
					}
					stdoutBuffer = '';
				}
				send(
					sseEncode(
						{ type: 'process_exit', code, stderr_tail: stderrTail },
						'process_exit'
					)
				);
				close();
			});

			request.signal.addEventListener('abort', () => {
				child.kill('SIGTERM');
				close();
			});
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
};
