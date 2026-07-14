#!/usr/bin/env bun
/**
 * Create + configure a Vercel project for a site in this monorepo, no dashboard clicking.
 *
 *   bun scripts/vercel-deploy.ts <slug> [--domain=example.dk] [--project=<name>] [--no-deploy]
 *
 * What it does (idempotent — safe to re-run):
 *   1. Creates the Vercel project (named after the slug) connected to this GitHub repo,
 *      with Root Directory = sites/<slug>, framework = Next.js.
 *   2. Sets an ignored-build-step so pushes only rebuild this site when
 *      sites/<slug>/ or packages/ or the lockfile changed.
 *   3. Upserts all env vars: SITE_SLUG=<slug> plus the shared Supabase/PostHog
 *      keys read from sites/blank-demo/.env.local. Never typed by hand.
 *   4. Optionally attaches a custom domain (--domain, repeatable).
 *   5. Triggers a production deployment from the current git branch.
 *
 * Auth: needs VERCEL_TOKEN (create at https://vercel.com/account/tokens) in the
 * environment or in a root .env.local. Optional VERCEL_TEAM_ID / VERCEL_TEAM_SLUG
 * if the projects live in a team rather than your personal account.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const SITES = resolve(ROOT, "sites");
const SHARED_ENV_SOURCE = resolve(SITES, "blank-demo/.env.local");

const SHARED_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
] as const;

const API = "https://api.vercel.com";

// ——— CLI args ———

type Args = {
  slug: string;
  project: string;
  domains: string[];
  deploy: boolean;
};

function parseArgs(argv: string[]): Args {
  let slug: string | null = null;
  let project: string | null = null;
  const domains: string[] = [];
  let deploy = true;

  for (const arg of argv) {
    if (arg.startsWith("--domain=")) domains.push(arg.slice("--domain=".length));
    else if (arg.startsWith("--project=")) project = arg.slice("--project=".length);
    else if (arg === "--no-deploy") deploy = false;
    else if (!arg.startsWith("--") && !slug) slug = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!slug) {
    throw new Error(
      "Usage: bun scripts/vercel-deploy.ts <slug> [--domain=example.dk] [--project=<name>] [--no-deploy]",
    );
  }
  return { slug, project: project ?? slug, domains, deploy };
}

// ——— env helpers ———

function parseDotEnv(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const noExport = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    const eq = noExport.indexOf("=");
    if (eq === -1) continue;
    const key = noExport.slice(0, eq).trim();
    let val = noExport.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function readDotEnvFile(abs: string): Record<string, string> {
  if (!existsSync(abs)) return {};
  try {
    return parseDotEnv(readFileSync(abs, "utf8"));
  } catch {
    return {};
  }
}

/** VERCEL_TOKEN etc. from process.env, falling back to the root .env.local. */
function loadVercelAuth(): { token: string; teamQuery: string } {
  const rootEnv = readDotEnvFile(resolve(ROOT, ".env.local"));
  const token = process.env.VERCEL_TOKEN || rootEnv.VERCEL_TOKEN || "";
  if (!token) {
    throw new Error(
      "VERCEL_TOKEN not set. Create one at https://vercel.com/account/tokens and put\n" +
        "  VERCEL_TOKEN=...\n" +
        `in ${resolve(ROOT, ".env.local")} (gitignored) or export it in your shell.`,
    );
  }
  const teamId = process.env.VERCEL_TEAM_ID || rootEnv.VERCEL_TEAM_ID || "";
  const teamSlug = process.env.VERCEL_TEAM_SLUG || rootEnv.VERCEL_TEAM_SLUG || "";
  const params = new URLSearchParams();
  if (teamId) params.set("teamId", teamId);
  else if (teamSlug) params.set("slug", teamSlug);
  const qs = params.toString();
  return { token, teamQuery: qs ? `?${qs}` : "" };
}

// ——— Vercel API client ———

let AUTH: { token: string; teamQuery: string };

async function vercel<T = Record<string, unknown>>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown,
): Promise<{ status: number; data: T }> {
  const sep = path.includes("?") ? AUTH.teamQuery.replace("?", "&") : AUTH.teamQuery;
  const res = await fetch(`${API}${path}${sep}`, {
    method,
    headers: {
      Authorization: `Bearer ${AUTH.token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data };
}

function apiError(action: string, status: number, data: unknown): Error {
  const err = (data as { error?: { code?: string; message?: string } })?.error;
  return new Error(
    `${action} failed (HTTP ${status}${err?.code ? `, ${err.code}` : ""}): ${err?.message ?? JSON.stringify(data)}`,
  );
}

// ——— steps ———

type Project = {
  id: string;
  name: string;
  link?: { type?: string; repoId?: number; org?: string; repo?: string };
};

function gitRepoSlug(): string {
  const url = Bun.spawnSync(["git", "remote", "get-url", "origin"], { cwd: ROOT })
    .stdout.toString()
    .trim();
  const m = url.match(/github\.com[/:]([^/]+\/[^/.]+)(\.git)?/);
  if (!m) throw new Error(`Could not parse GitHub repo from origin remote: ${url}`);
  return m[1];
}

function currentBranch(): string {
  return (
    Bun.spawnSync(["git", "branch", "--show-current"], { cwd: ROOT }).stdout.toString().trim() ||
    "main"
  );
}

async function getProject(name: string): Promise<Project | null> {
  const { status, data } = await vercel<Project>("GET", `/v9/projects/${name}`);
  if (status === 404) return null;
  if (status >= 400) throw apiError(`Fetching project ${name}`, status, data);
  return data;
}

async function createProject(name: string, repo: string): Promise<Project> {
  const { status, data } = await vercel<Project>("POST", "/v11/projects", {
    name,
    framework: "nextjs",
    gitRepository: { type: "github", repo },
  });
  if (status >= 400) throw apiError(`Creating project ${name}`, status, data);
  return data;
}

async function configureProject(name: string, slug: string): Promise<Project> {
  // Only rebuild when this site, the shared packages, or the lockfile changed.
  // Runs inside rootDirectory; exit 0 = skip build, non-zero = build.
  const ignoreCmd = "git diff --quiet HEAD^ HEAD -- . ../../packages ../../bun.lock";
  const { status, data } = await vercel<Project>("PATCH", `/v9/projects/${name}`, {
    framework: "nextjs",
    rootDirectory: `sites/${slug}`,
    sourceFilesOutsideRootDirectory: true,
    commandForIgnoringBuildStep: ignoreCmd,
  });
  if (status >= 400) throw apiError(`Configuring project ${name}`, status, data);
  return data;
}

async function upsertEnv(name: string, slug: string): Promise<string[]> {
  const shared = readDotEnvFile(SHARED_ENV_SOURCE);
  const vars: Record<string, string> = { SITE_SLUG: slug };
  const missing: string[] = [];
  for (const key of SHARED_ENV_KEYS) {
    const val = (shared[key] ?? "").trim();
    if (val) vars[key] = val;
    else missing.push(key);
  }

  const evs = Object.entries(vars).map(([key, value]) => ({
    key,
    value,
    type: "encrypted",
    target: ["production", "preview", "development"],
  }));

  const { status, data } = await vercel("POST", `/v10/projects/${name}/env?upsert=true`, evs);
  if (status >= 400) throw apiError(`Upserting env vars on ${name}`, status, data);
  return missing;
}

async function addDomain(name: string, domain: string): Promise<void> {
  const { status, data } = await vercel("POST", `/v10/projects/${name}/domains`, { name: domain });
  const code = (data as { error?: { code?: string } })?.error?.code;
  if (status >= 400 && code !== "domain_already_in_use") {
    throw apiError(`Adding domain ${domain}`, status, data);
  }
  console.log(
    status >= 400
      ? `→ Domain ${domain} already attached`
      : `→ Domain ${domain} attached (point DNS at Vercel if you haven't)`,
  );
}

async function triggerDeploy(project: Project, branch: string): Promise<string | null> {
  const repoId = project.link?.repoId;
  if (!repoId) return null;
  const { status, data } = await vercel<{ url?: string }>("POST", "/v13/deployments", {
    name: project.name,
    project: project.name,
    target: "production",
    gitSource: { type: "github", repoId, ref: branch },
  });
  if (status >= 400) throw apiError(`Triggering deployment for ${project.name}`, status, data);
  return data.url ? `https://${data.url}` : null;
}

// ——— main ———

async function main(): Promise<void> {
  const args = parseArgs(Bun.argv.slice(2));

  const siteDir = resolve(SITES, args.slug);
  const pkgPath = resolve(siteDir, "package.json");
  if (!existsSync(pkgPath)) {
    throw new Error(`sites/${args.slug}/package.json not found — is that a Next.js site?`);
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    dependencies?: Record<string, string>;
  };
  if (!pkg.dependencies?.next) {
    throw new Error(`sites/${args.slug} has no "next" dependency — this script only deploys Next.js sites.`);
  }

  AUTH = loadVercelAuth();
  const repo = gitRepoSlug();
  const branch = currentBranch();

  let project = await getProject(args.project);
  if (project) {
    console.log(`→ Project ${args.project} already exists — updating config + env`);
  } else {
    console.log(`→ Creating Vercel project ${args.project} (repo ${repo}, root sites/${args.slug})`);
    project = await createProject(args.project, repo);
  }

  project = await configureProject(args.project, args.slug);
  console.log(`→ Configured: rootDirectory=sites/${args.slug}, framework=nextjs, build-skip filter on`);

  const missing = await upsertEnv(args.project, args.slug);
  console.log(`→ Env vars upserted (SITE_SLUG + ${SHARED_ENV_KEYS.length - missing.length} shared keys from sites/blank-demo/.env.local)`);
  if (missing.length) {
    console.warn(`  ⚠ Missing in ${SHARED_ENV_SOURCE}: ${missing.join(", ")} — not set on Vercel.`);
  }

  for (const domain of args.domains) {
    await addDomain(args.project, domain);
  }

  if (!project.link?.repoId) {
    console.warn(
      "⚠ Project has no git link (GitHub app not connected?). Connect the repo once in the Vercel dashboard, then re-run.",
    );
  } else if (args.deploy) {
    console.log(`→ Triggering production deployment from ${branch}...`);
    const url = await triggerDeploy(project, branch);
    console.log(`\n✓ Deploying ${args.project}${url ? ` — ${url}` : ""}`);
    console.log(`  Dashboard: https://vercel.com — project "${args.project}"`);
  } else {
    console.log(`\n✓ Project ${args.project} ready — next push to ${branch} deploys it.`);
  }
}

main().catch((err) => {
  console.error(String(err?.message ?? err));
  process.exit(1);
});
