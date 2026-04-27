import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { spawn } from 'node:child_process';
import { mapsLeadsFetcherRoot } from '$lib/repoPaths';
import { normalize, relative, resolve, sep } from 'node:path';

interface FetchRequestBody {
	query?: unknown;
	lat?: unknown;
	lng?: unknown;
	radiusM?: unknown;
	rankByDistance?: unknown;
	regionCode?: unknown;
	languageCode?: unknown;
	count?: unknown;
	output?: unknown;
	csvOutput?: unknown;
	noCsv?: unknown;
	fieldMask?: unknown;
}

const MAX_QUERY_LEN = 500;
const MIN_RADIUS = 50;
const MAX_RADIUS = 100_000;

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

/** Repo-relative POSIX-ish path; rejects escapes. */
function assertRepoRelativePath(raw: string, label: string): string {
	const trimmed = raw.trim();
	if (!trimmed) error(400, `${label} must be non-empty`);
	const norm = normalize(trimmed);
	if (norm.includes('..')) error(400, `${label} must not contain '..'`);
	const abs = resolve(mapsLeadsFetcherRoot, norm);
	const rel = relative(mapsLeadsFetcherRoot, abs);
	if (rel.startsWith('..') || rel === '') error(400, `${label} must be under the repo root`);
	return rel.split(sep).join('/');
}

export const POST: RequestHandler = async ({ request }) => {
	let body: FetchRequestBody;
	try {
		body = (await request.json()) as FetchRequestBody;
	} catch {
		error(400, 'Body must be valid JSON');
	}

	const queryRaw = body.query;
	if (typeof queryRaw !== 'string' || !queryRaw.trim()) {
		error(400, 'query must be a non-empty string');
	}
	const query = queryRaw.trim();
	if (query.length > MAX_QUERY_LEN) {
		error(400, `query must be at most ${MAX_QUERY_LEN} characters`);
	}

	const lat = body.lat;
	const lng = body.lng;
	if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
		error(400, 'lat and lng must be finite numbers');
	}
	if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
		error(400, 'lat must be [-90,90] and lng must be [-180,180]');
	}

	const radiusRaw = body.radiusM;
	const radiusM =
		typeof radiusRaw === 'number' && Number.isFinite(radiusRaw) ? radiusRaw : 25_000;
	if (radiusM < MIN_RADIUS || radiusM > MAX_RADIUS) {
		error(400, `radiusM must be between ${MIN_RADIUS} and ${MAX_RADIUS}`);
	}

	const rankByDistance = body.rankByDistance !== false;

	const regionRaw = body.regionCode;
	const regionCode =
		typeof regionRaw === 'string' && regionRaw.trim() ? regionRaw.trim().toUpperCase() : 'DK';

	const langRaw = body.languageCode;
	const languageCode =
		typeof langRaw === 'string' && langRaw.trim() ? langRaw.trim().toLowerCase() : 'da';

	const countRaw = body.count;
	const count =
		typeof countRaw === 'number' && Number.isInteger(countRaw) ? countRaw : 10;
	if (count < 1 || count > 20) {
		error(400, 'count must be an integer between 1 and 20');
	}

	const outputRel =
		typeof body.output === 'string' && body.output.trim()
			? assertRepoRelativePath(body.output, 'output')
			: 'maps_businesses.json';

	const noCsv = body.noCsv === true;

	let csvRel: string | null = null;
	if (!noCsv && typeof body.csvOutput === 'string' && body.csvOutput.trim()) {
		csvRel = assertRepoRelativePath(body.csvOutput, 'csvOutput');
	}

	const fieldMaskRaw = body.fieldMask;
	const fieldMask =
		typeof fieldMaskRaw === 'string' && fieldMaskRaw.trim() ? fieldMaskRaw.trim() : '*';

	const runId = makeRunId();

	const args: string[] = [
		'run',
		'fetch_businesses.py',
		'--json-events',
		'--run-id',
		runId,
		'-q',
		query,
		'--lat',
		String(lat),
		'--lng',
		String(lng),
		'--radius-m',
		String(radiusM),
		'--region-code',
		regionCode,
		'--language-code',
		languageCode,
		'-n',
		String(count),
		'-o',
		outputRel,
		'--field-mask',
		fieldMask
	];

	if (!rankByDistance) {
		args.push('--no-distance-rank');
	}
	if (noCsv) {
		args.push('--no-csv');
	} else if (csvRel) {
		args.push('--csv-output', csvRel);
	}

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
