#!/usr/bin/env bun
/**
 * Scaffold a new site under apps/<slug>.
 *
 *   bun scripts/create-site.ts <slug> [--blank] [--theme=kaffe] [--host=localhost:3001] [--port=3001] [--db]
 *
 * Themed (default): copies kaffe's theme components + layout + globals.
 * --blank: empty skeleton with no theme, minimal globals, hello-world page.
 *
 * --db: inserts into the Supabase `sites` and `site_hosts` tables using
 * SUPABASE_SERVICE_ROLE_KEY. Without it, the scaffolder prints the SQL
 * for you to run manually.
 */

import { $ } from "bun";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const KAFFE = resolve(ROOT, "apps/kaffe");

type Args = {
  slug: string;
  blank: boolean;
  theme: string;
  host: string;
  port: number;
  db: boolean;
};

function parseArgs(argv: string[]): Args {
  let slug: string | null = null;
  let blank = false;
  let theme = "kaffe";
  let host: string | null = null;
  let port: number | null = null;
  let db = false;

  for (const arg of argv) {
    if (arg === "--blank") blank = true;
    else if (arg === "--db") db = true;
    else if (arg.startsWith("--theme=")) theme = arg.slice("--theme=".length);
    else if (arg.startsWith("--host=")) host = arg.slice("--host=".length);
    else if (arg.startsWith("--port=")) port = Number(arg.slice("--port=".length));
    else if (!arg.startsWith("--") && !slug) slug = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!slug) throw new Error("Usage: bun scripts/create-site.ts <slug> [--blank] [--theme=kaffe] [--host=...] [--port=...] [--db]");
  if (!/^[a-z][a-z0-9-]{1,30}$/.test(slug)) {
    throw new Error(`Slug must match /^[a-z][a-z0-9-]{1,30}$/ — got ${JSON.stringify(slug)}`);
  }

  const resolvedPort = port ?? autoPickPort();
  const resolvedHost = host ?? `localhost:${resolvedPort}`;

  return { slug, blank, theme, host: resolvedHost, port: resolvedPort, db };
}

function autoPickPort(): number {
  const appsDir = resolve(ROOT, "apps");
  if (!existsSync(appsDir)) return 3001;
  let max = 3000;
  for (const entry of readdirSync(appsDir)) {
    const pkgPath = resolve(appsDir, entry, "package.json");
    if (!existsSync(pkgPath)) continue;
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
        scripts?: Record<string, string>;
      };
      const dev = pkg.scripts?.dev ?? "";
      const match = dev.match(/--port[= ](\d+)/);
      const p = match ? Number(match[1]) : 3000; // kaffe has no --port, it uses 3000
      if (p > max) max = p;
    } catch {
      /* ignore */
    }
  }
  return max + 1;
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

// ——— Templates ———

function pkgJson(args: Args, kaffePkg: Record<string, unknown>): string {
  const devScript = `next dev --port ${args.port}`;
  return (
    JSON.stringify(
      {
        name: `@autosites/site-${args.slug}`,
        version: "0.1.0",
        private: true,
        type: "module",
        scripts: {
          dev: devScript,
          build: "next build",
          start: `next start --port ${args.port}`,
          lint: "eslint",
          "cms:pull": "bun scripts/cms-sync.ts pull --site",
          "cms:push": "bun scripts/cms-sync.ts push --site",
        },
        dependencies: {
          "@autosites/analytics": "workspace:*",
          "@autosites/cms": "workspace:*",
          "@autosites/site-shell": "workspace:*",
          "@supabase/ssr": "^0.10.2",
          "@supabase/supabase-js": "^2.103.2",
          next: "16.2.4",
          "posthog-js": "^1.369.3",
          "posthog-node": "^5.29.2",
          react: "19.2.4",
          "react-dom": "19.2.4",
        },
        devDependencies: (kaffePkg.devDependencies ?? {}) as Record<string, string>,
        ignoreScripts: kaffePkg.ignoreScripts,
        trustedDependencies: kaffePkg.trustedDependencies,
      },
      null,
      2,
    ) + "\n"
  );
}

const NEXT_CONFIG = `import type { NextConfig } from "next";
import { sharedImagePatterns, sharedRewrites } from "@autosites/site-shell/next-config";

const nextConfig: NextConfig = {
  cacheComponents: true,
  skipTrailingSlashRedirect: true,
  transpilePackages: ["@autosites/analytics", "@autosites/cms", "@autosites/site-shell"],
  images: {
    remotePatterns: [...sharedImagePatterns],
  },
  async rewrites() {
    return [...sharedRewrites];
  },
};

export default nextConfig;
`;

const PROXY = `export { proxy } from "@autosites/cms/proxy";

// Config must be declared statically at the app root — Next can't see it
// through a re-export. Keep the matcher in sync with packages/cms/src/proxy.ts.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?)).*)",
  ],
};
`;

const INSTRUMENTATION = `export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { setCmsLogger } = await import("@autosites/cms/logger");
  const { cmsLogger } = await import("@autosites/analytics/cms-logger");
  setCmsLogger(cmsLogger);

  const { setAnalyticsContextResolver } = await import("@autosites/analytics/server");
  const { getSiteId } = await import("@autosites/cms/server/site");
  const { createSessionServerClient } = await import("@autosites/cms/server/supabase");
  setAnalyticsContextResolver({
    getSiteId,
    async getCurrentUser() {
      const supabase = await createSessionServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return { id: user?.id ?? null, email: user?.email ?? null };
    },
  });
}
`;

const STUB_LOGIN_PAGE = `export { default, metadata } from "@autosites/cms/admin/login/page";\n`;
const STUB_EDIT_ROUTE = `export { GET } from "@autosites/cms/admin/edit";\n`;
const STUB_AUTH_CALLBACK = `export { GET } from "@autosites/cms/admin/auth-callback";\n`;

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

function blankLayout(title: string): string {
  return `import type { Metadata } from "next";
import "./globals.css";
import { SiteShell } from "@autosites/site-shell/SiteShell";

export const metadata: Metadata = {
  title: ${JSON.stringify(title)},
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
`;
}

function blankPage(slug: string): string {
  return `export default function Home() {
  return <main style={{ padding: "4rem" }}>Hello, ${slug}</main>;
}
`;
}

const BLANK_GLOBALS = `@import "tailwindcss";

:root {
  --bg: #ffffff;
  --text: #111111;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: var(--bg);
  color: var(--text);
}
`;

function envExample(): string {
  return `NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
`;
}

// ——— Main ———

async function main(): Promise<void> {
  const args = parseArgs(Bun.argv.slice(2));
  const appDir = resolve(ROOT, "apps", args.slug);

  if (existsSync(appDir)) {
    throw new Error(`apps/${args.slug} already exists — aborting.`);
  }

  console.log(`→ Scaffolding apps/${args.slug} (${args.blank ? "blank" : "themed: " + args.theme}) on port ${args.port}`);

  await $`mkdir -p ${appDir}/app/cms/login ${appDir}/app/cms/edit ${appDir}/app/auth/callback ${appDir}/public`.quiet();

  const kaffePkg = JSON.parse(await readKaffe("package.json")) as Record<string, unknown>;

  await writeFile("package.json", pkgJson(args, kaffePkg), appDir);
  await writeFile("tsconfig.json", await readKaffe("tsconfig.json"), appDir);
  await writeFile("next.config.ts", NEXT_CONFIG, appDir);
  await writeFile("proxy.ts", PROXY, appDir);
  await writeFile("instrumentation.ts", INSTRUMENTATION, appDir);
  await writeFile("postcss.config.mjs", await readKaffe("postcss.config.mjs"), appDir);
  await writeFile("eslint.config.mjs", await readKaffe("eslint.config.mjs"), appDir);
  await writeFile(".env.local.example", envExample(), appDir);

  // Admin route stubs
  await writeFile("app/cms/login/page.tsx", STUB_LOGIN_PAGE, appDir);
  await writeFile("app/cms/edit/route.ts", STUB_EDIT_ROUTE, appDir);
  await writeFile("app/auth/callback/route.ts", STUB_AUTH_CALLBACK, appDir);

  const titlePlaceholder = capitalize(args.slug);

  if (args.blank) {
    await writeFile("app/layout.tsx", blankLayout(titlePlaceholder), appDir);
    await writeFile("app/page.tsx", blankPage(args.slug), appDir);
    await writeFile("app/globals.css", BLANK_GLOBALS, appDir);
  } else {
    // themed = copy kaffe layout/page/globals + theme components + public/favicon
    await writeFile("app/layout.tsx", themedLayout(titlePlaceholder), appDir);
    await writeFile("app/page.tsx", await readKaffe("app/page.tsx"), appDir);
    await writeFile("app/globals.css", await readKaffe("app/globals.css"), appDir);
    await copyDir(resolve(KAFFE, `components/${args.theme}`), resolve(appDir, `components/${args.theme}`));
    if (existsSync(resolve(KAFFE, "app/favicon.ico"))) {
      await $`cp ${resolve(KAFFE, "app/favicon.ico")} ${appDir}/app/favicon.ico`.quiet();
    }
  }

  // DB setup — either seed directly via service-role, or print SQL
  const seedSql = `insert into sites (slug, name) values ('${args.slug}', '${titlePlaceholder}')\n  on conflict (slug) do nothing\n  returning id;\ninsert into site_hosts (host, site_id)\n  select '${args.host}', id from sites where slug = '${args.slug}'\n  on conflict (host) do nothing;\n`;

  if (args.db) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("--db requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.");
    }
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: siteRow, error: siteErr } = await admin
      .from("sites")
      .upsert({ slug: args.slug, name: titlePlaceholder }, { onConflict: "slug" })
      .select("id")
      .single();
    if (siteErr) throw new Error(`sites upsert failed: ${siteErr.message}`);
    const { error: hostErr } = await admin
      .from("site_hosts")
      .upsert({ host: args.host, site_id: siteRow.id }, { onConflict: "host" });
    if (hostErr) throw new Error(`site_hosts upsert failed: ${hostErr.message}`);
    console.log(`→ Seeded sites.${args.slug} and site_hosts.${args.host}`);
  } else {
    console.log(`→ Skipping DB seed. Run this SQL against Supabase:\n\n${seedSql}`);
  }

  console.log("→ Running bun install to wire workspace symlinks...");
  await $`bun install`.cwd(ROOT);

  console.log(`\n✓ Scaffolded apps/${args.slug}`);
  console.log("\nNext steps:");
  console.log(`  cp apps/${args.slug}/.env.local.example apps/${args.slug}/.env.local`);
  console.log(`  # fill in Supabase + PostHog vars`);
  if (!args.db) console.log(`  # run the SQL above against Supabase`);
  console.log(`  bun --cwd apps/${args.slug} dev`);
  console.log(`  # → http://${args.host}`);
}

main().catch((err) => {
  console.error(String(err?.message ?? err));
  process.exit(1);
});
