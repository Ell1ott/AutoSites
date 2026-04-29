#!/usr/bin/env bun
/**
 * Scaffold a new site under sites/<slug>.
 *
 *   bun scripts/create-site.ts <slug> [--blank] [--theme=blank|kaffe|…] [--port=3001] [--no-db]
 *
 * Default: copies sites/blank-demo (minimal layout, globals, hello-world page).
 * --theme=kaffe (or another name): uses kaffe's layout/fonts/page/globals + components/<theme>.
 * --blank: same as default blank-demo shell (ignores --theme).
 *
 * Inserts/updates `public.sites` for the new slug via @supabase/supabase-js using
 * NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from sites/blank-demo/.env.local only.
 * Use --no-db to skip. If that file or keys are missing, prints SQL instead.
 *
 * Writes `.env.local` with SITE_SLUG=<slug> and Supabase/PostHog keys copied from
 * `sites/blank-demo/.env.local` (fallback: `.env.local.example`).
 */

import { $ } from "bun";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const SITES = resolve(ROOT, "sites");
/** Canonical scaffold: copy configs, stubs, and default app shell from here. */
const TEMPLATE = resolve(SITES, "blank-demo");
/** Theme assets (components + full kaffe page/globals) live under kaffe. */
const KAFFE = resolve(SITES, "kaffe");

/** Keys copied from blank-demo env into each new site's `.env.local` (never copy SITE_SLUG). */
const INHERIT_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
] as const;

type Args = {
  slug: string;
  blank: boolean;
  theme: string;
  port: number;
  noDb: boolean;
};

function parseArgs(argv: string[]): Args {
  let slug: string | null = null;
  let blank = false;
  let theme = "blank";
  let port: number | null = null;
  let noDb = false;

  for (const arg of argv) {
    if (arg === "--blank") blank = true;
    else if (arg === "--no-db") noDb = true;
    else if (arg.startsWith("--theme=")) theme = arg.slice("--theme=".length);
    else if (arg.startsWith("--port=")) port = Number(arg.slice("--port=".length));
    else if (!arg.startsWith("--") && !slug) slug = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!slug)
    throw new Error("Usage: bun scripts/create-site.ts <slug> [--blank] [--theme=blank|kaffe|…] [--port=...] [--no-db]");
  if (!/^[a-z][a-z0-9-]{1,30}$/.test(slug)) {
    throw new Error(`Slug must match /^[a-z][a-z0-9-]{1,30}$/ — got ${JSON.stringify(slug)}`);
  }

  return { slug, blank, theme, port: port ?? autoPickPort(), noDb };
}

function autoPickPort(): number {
  if (!existsSync(SITES)) return 3001;
  let max = 3000;
  for (const entry of readdirSync(SITES)) {
    const pkgPath = resolve(SITES, entry, "package.json");
    if (!existsSync(pkgPath)) continue;
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
        scripts?: Record<string, string>;
      };
      const dev = pkg.scripts?.dev ?? "";
      const match = dev.match(/--port[= ](\d+)/);
      const p = match ? Number(match[1]) : 3000;
      if (p > max) max = p;
    } catch {
      /* ignore */
    }
  }
  return max + 1;
}

async function readTemplate(relPath: string): Promise<string> {
  return Bun.file(resolve(TEMPLATE, relPath)).text();
}

async function readKaffe(relPath: string): Promise<string> {
  return Bun.file(resolve(KAFFE, relPath)).text();
}

async function writeFile(relPath: string, content: string, appDir: string): Promise<void> {
  await Bun.write(resolve(appDir, relPath), content);
}

async function copyDir(src: string, dst: string): Promise<void> {
  await $`mkdir -p ${dst}`.quiet();
  await $`cp -R ${src}/. ${dst}/`.quiet();
}

function capitalize(s: string): string {
  return s.replace(/(^|[-_])(\w)/g, (_, __, c: string) => c.toUpperCase());
}

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
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/** Read blank-demo env for shared Supabase/PostHog defaults. */
function loadBlankDemoEnv(): { vars: Record<string, string>; sourceRel: string | null } {
  const candidates = [".env.local", ".env.local.example"] as const;
  for (const name of candidates) {
    const abs = resolve(TEMPLATE, name);
    if (!existsSync(abs)) continue;
    try {
      const raw = readFileSync(abs, "utf8");
      return { vars: parseDotEnv(raw), sourceRel: `sites/blank-demo/${name}` };
    } catch {
      /* try next */
    }
  }
  return { vars: {}, sourceRel: null };
}

function pickInheritedEnv(source: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of INHERIT_ENV_KEYS) {
    out[key] = source[key] ?? "";
  }
  return out;
}

function formatEnvLocal(slug: string, inherited: Record<string, string>): string {
  const lines: string[] = [`SITE_SLUG=${slug}`];
  for (const key of INHERIT_ENV_KEYS) {
    lines.push(`${key}=${inherited[key] ?? ""}`);
  }
  return `${lines.join("\n")}\n`;
}

/**
 * Supabase client with service role — credentials from sites/blank-demo/.env.local only
 * (not process.env, not .env.local.example).
 */
function createSupabaseAdminFromBlankDemoEnv():
  | { client: ReturnType<typeof createClient>; sourceRel: string }
  | null {
  const name = ".env.local" as const;
  const abs = resolve(TEMPLATE, name);
  if (!existsSync(abs)) return null;
  let raw: string;
  try {
    raw = readFileSync(abs, "utf8");
  } catch {
    return null;
  }
  const vars = parseDotEnv(raw);
  const url = (vars.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (vars.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { client, sourceRel: `sites/blank-demo/${name}` };
}

// ——— Templates ———

function pkgJson(args: Args, templatePkg: Record<string, unknown>): string {
  const devScript = `next dev --turbopack --port ${args.port}`;
  const scripts = {
    ...((templatePkg.scripts ?? {}) as Record<string, string>),
    dev: devScript,
    start: `next start --port ${args.port}`,
  };
  const merged = {
    ...templatePkg,
    name: `@autosites/site-${args.slug}`,
    scripts,
  };
  return `${JSON.stringify(merged, null, 2)}\n`;
}

function themedLayout(title: string): string {
  return `import type { Metadata } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { SiteShell } from "@autosites/site-shell/SiteShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["200", "300", "400"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: ${JSON.stringify(title)},
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={\`\${inter.variable} \${ebGaramond.variable}\`}>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
`;
}

/** Layout/page copied from blank-demo with site-specific title and slug placeholders. */
async function blankDemoAppLayout(title: string): Promise<string> {
  const raw = await readTemplate("app/layout.tsx");
  return raw.replace(/title:\s*"BlankDemo"/, `title: ${JSON.stringify(title)}`);
}

async function blankDemoAppPage(slug: string): Promise<string> {
  const raw = await readTemplate("app/page.tsx");
  return raw.replace(/blank-demo/g, slug);
}

function envExample(slug: string): string {
  return formatEnvLocal(slug, pickInheritedEnv({}));
}

// ——— Main ———

async function main(): Promise<void> {
  const args = parseArgs(Bun.argv.slice(2));
  const appDir = resolve(SITES, args.slug);

  if (existsSync(appDir)) {
    throw new Error(`sites/${args.slug} already exists — aborting.`);
  }

  const { vars: blankDemoVars, sourceRel: blankDemoEnvSource } = loadBlankDemoEnv();
  const inheritedEnv = pickInheritedEnv(blankDemoVars);

  if (!blankDemoEnvSource) {
    console.warn(
      "→ No sites/blank-demo/.env.local or .env.local.example — .env.local will have empty Supabase/PostHog values.",
    );
  } else {
    console.log(`→ Env copied from ${blankDemoEnvSource} (SITE_SLUG=${args.slug})`);
  }

  const useBlankShell = args.blank || args.theme === "blank";
  console.log(
    `→ Scaffolding sites/${args.slug} (${useBlankShell ? "from blank-demo" : `themed: ${args.theme}`}) on port ${args.port}`,
  );

  await $`mkdir -p ${appDir}/app/cms/login ${appDir}/app/cms/edit ${appDir}/app/auth/callback ${appDir}/public`.quiet();

  const templatePkg = JSON.parse(await readTemplate("package.json")) as Record<string, unknown>;

  await writeFile("package.json", pkgJson(args, templatePkg), appDir);
  await writeFile("tsconfig.json", await readTemplate("tsconfig.json"), appDir);
  await writeFile("next.config.ts", await readTemplate("next.config.ts"), appDir);
  await writeFile("proxy.ts", await readTemplate("proxy.ts"), appDir);
  await writeFile("instrumentation.ts", await readTemplate("instrumentation.ts"), appDir);
  await writeFile("postcss.config.mjs", await readTemplate("postcss.config.mjs"), appDir);
  await writeFile("eslint.config.mjs", await readTemplate("eslint.config.mjs"), appDir);
  await writeFile(".env.local", formatEnvLocal(args.slug, inheritedEnv), appDir);
  await writeFile(".env.local.example", envExample(args.slug), appDir);

  await writeFile("app/cms/login/page.tsx", await readTemplate("app/cms/login/page.tsx"), appDir);
  await writeFile("app/cms/edit/route.ts", await readTemplate("app/cms/edit/route.ts"), appDir);
  await writeFile("app/auth/callback/route.ts", await readTemplate("app/auth/callback/route.ts"), appDir);

  const titlePlaceholder = capitalize(args.slug);

  if (useBlankShell) {
    await writeFile("app/layout.tsx", await blankDemoAppLayout(titlePlaceholder), appDir);
    await writeFile("app/page.tsx", await blankDemoAppPage(args.slug), appDir);
    await writeFile("app/globals.css", await readTemplate("app/globals.css"), appDir);
  } else {
    await writeFile("app/layout.tsx", themedLayout(titlePlaceholder), appDir);
    await writeFile("app/page.tsx", await readKaffe("app/page.tsx"), appDir);
    await writeFile("app/globals.css", await readKaffe("app/globals.css"), appDir);
    await copyDir(resolve(KAFFE, `components/${args.theme}`), resolve(appDir, `components/${args.theme}`));
    if (existsSync(resolve(KAFFE, "app/favicon.ico"))) {
      await $`cp ${resolve(KAFFE, "app/favicon.ico")} ${appDir}/app/favicon.ico`.quiet();
    }
  }

  const seedSql = `insert into public.sites (slug, name) values ('${args.slug}', '${titlePlaceholder.replace(/'/g, "''")}')\n  on conflict (slug) do nothing;\n`;

  if (args.noDb) {
    console.log(`→ Skipped DB seed (--no-db). If needed, run:\n\n${seedSql}`);
  } else {
    const admin = createSupabaseAdminFromBlankDemoEnv();
    if (admin) {
      const { error: siteErr } = await admin.client
        .from("sites")
        .upsert({ slug: args.slug, name: titlePlaceholder }, { onConflict: "slug" });
      if (siteErr) throw new Error(`sites upsert failed: ${siteErr.message}`);
      console.log(`→ Upserted public.sites for ${args.slug} (Supabase client, ${admin.sourceRel})`);
    } else {
      console.warn(
        "→ No sites/blank-demo/.env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY — skipped DB seed. Run:\n\n" +
          seedSql,
      );
    }
  }

  console.log("→ Running bun install to wire workspace symlinks...");
  await $`bun install`.cwd(ROOT);

  console.log(`\n✓ Scaffolded sites/${args.slug}`);
  console.log("\nNext steps:");
  if (!blankDemoEnvSource) console.log(`  # fill in sites/${args.slug}/.env.local (Supabase + PostHog)`);
  console.log(`  bun --cwd sites/${args.slug} dev`);
  console.log(`  # → http://localhost:${args.port}`);
}

main().catch((err) => {
  console.error(String(err?.message ?? err));
  process.exit(1);
});
