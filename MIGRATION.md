# AutoSites monorepo migration — handoff

> Temporary document. Delete after Phase F is complete.
>
> **For the Claude instance picking this up:** read this file top-to-bottom first. It replaces the original brainstorming conversation. Everything you need is here. Start by running `git log --oneline -5` and `git status` to confirm you're on commit `51264a38` (Phase A done) with a clean working tree.

## Where we are

- **Phase A: done** (commit `51264a38`). Repo is now a Bun workspace at `/Users/elliottfriedrich/Documents/GitHub/AutoSites/`. `coffeShopTest/` was renamed to `apps/kaffe/` via `git mv` (history preserved). Root `package.json` declares `apps/*` + `packages/*` workspaces. Single `bun.lock` at repo root. Kaffe dev server boots cleanly (`bun --cwd apps/kaffe dev` — verified).
- **Phases B–F: pending.** Covered below.

## Goal (why this work exists)

Extract shared auth + CMS + analytics into workspace packages so we can spin up new Next.js sites (`apps/<slug>/`) that are thin shells around the shared code. Update once → all sites get it. A scaffolder (`bun scripts/create-site.ts <slug>`) produces new apps; a `--blank` flag produces a truly empty skeleton (no theme content).

## Fixed decisions (don't re-litigate)

1. **Bun workspaces**, not Turborepo. Turborepo is deferred to later.
2. **Monorepo layout**: `apps/<slug>/` + `packages/{cms,analytics,site-shell}/` + `scripts/create-site.ts`. `mapsLeadsFetcher/` stays at repo root, NOT in workspaces.
3. **Packages are source TS only.** No `dist/` build step. Next.js transpiles them in-app via `transpilePackages`. A build step would silently strip `"use server"` directives and break Server Actions.
4. **cms → analytics coupling: injected via `CmsLogger` interface.** CMS never imports analytics directly. Analytics registers itself at app boot. Breaks the import cycle and keeps the CMS bundle free of posthog. (Details in Phase B.)
5. **Analytics → cms coupling: injected context resolver.** Analytics never imports cms directly. App passes `{ getSiteId, createSessionServerClient }` at boot.
6. **`next/font` stays in each app's `app/layout.tsx`.** Don't move it into a package — it requires app-level build-time hoisting.
7. **Admin routes (login, edit, auth callback) + middleware live in `packages/cms`.** Each app has one-line re-export stubs.
8. **Exports map per subpath**, no barrel re-exports through a single `index.ts` for entries that touch `"use server"` or middleware. Each subpath is self-contained so Edge runtime and Server Action compilation stay clean.
9. **One shared Supabase project** for all sites. Multi-tenancy via the existing `sites`, `site_hosts`, `cms_admins` tables (already schema-ready). New site = new DB rows + new Next app.
10. **Every app needs these env vars**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (optional).

## Known gotchas before you start

- **Next.js version is 16.2.4** and `apps/kaffe/AGENTS.md` warns that APIs differ from training data. **Always read `apps/kaffe/node_modules/next/dist/docs/` before relying on memory.** This is non-negotiable.
- **`middleware` file convention is deprecated in Next 16 in favor of `proxy`.** Dev server logs: `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.` Handle this in Phase D when middleware moves into the package. Read `apps/kaffe/node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` and any proxy docs.
- **`/coffeShopTest/` placeholder directory.** Phase A's `git mv` broke the Claude shell harness (its initial cwd was the old `coffeShopTest/`). I put a `.cwd-placeholder` file there and gitignored `/coffeShopTest/` so the harness resolves its cwd. **Leave the placeholder in place until the migration is done.** The new Claude instance will NOT have this problem if you start it inside `/Users/elliottfriedrich/Documents/GitHub/AutoSites/` (not coffeShopTest), so you can delete the placeholder + gitignore entry at the very end.
- **`mapsLeadsFetcher/settings.json` has an unstaged modification** from before this work began. Ignore it; not ours to touch.
- **Server Action identity across apps is safe** because each app compiles the package locally. Forms always POST back to the app that rendered them. Do NOT pre-bundle packages.
- **No `@/` path imports inside `packages/`** — only relative or `@autosites/*` self-references. Each app keeps its own `"@/*": ["./*"]` alias.
- **Edge runtime constraint**: the middleware subpath must NOT transitively pull `posthog-node`, `next/cache#updateTag`, `next/server#after`, or the server actions file. Verify with a build after Phase D.
- **Tailwind v4 is app-scoped.** Current CMS components use inline styles + `packages/cms/src/client/editable.css` (plain CSS), so no Tailwind source config needed today. If you ever add Tailwind classes inside a package, add `@source "../../packages/cms/src/**/*.{ts,tsx}"` to each app's `globals.css`.
- **`cacheComponents: true`** must stay set in every app's `next.config.ts`. `getSiteId` relies on the public/session Supabase client split being respected inside `'use cache'` boundaries.

---

# Phase B — break the cms↔analytics cycle (inside kaffe, pre-extraction)

**Why:** Today `apps/kaffe/lib/cms/server/actions.ts` imports `@/lib/analytics/posthog-server`, and `apps/kaffe/lib/analytics/server/analytics-context.ts` imports from `@/lib/cms/...`. That cycle is invisible inside one app; once split across packages it becomes a hard dependency loop. Invert both directions to injection before extracting.

**Stay inside `apps/kaffe/` for this phase.** Don't create packages yet.

## B1. Add the CMS logger interface

Create `apps/kaffe/lib/cms/logger.ts`:

```ts
export type CmsLogger = {
  captureServerEvent(
    event: string,
    props?: Record<string, unknown>,
    ctx?: { userId?: string | null; email?: string | null; siteId?: string },
  ): Promise<void> | void;
};

export const NOOP_LOGGER: CmsLogger = { captureServerEvent: () => {} };

let active: CmsLogger = NOOP_LOGGER;
export function setCmsLogger(l: CmsLogger): void { active = l; }
export function getCmsLogger(): CmsLogger { return active; }
```

## B2. Route CMS event calls through the logger

Find every file under `apps/kaffe/lib/cms/` and `apps/kaffe/app/cms/`, `apps/kaffe/app/auth/` that imports from `@/lib/analytics/...`. Expected set:

- `apps/kaffe/lib/cms/server/actions.ts`
- `apps/kaffe/app/cms/login/actions.ts`
- `apps/kaffe/app/cms/edit/route.ts`
- `apps/kaffe/app/auth/callback/route.ts`
- possibly `apps/kaffe/lib/cms/client/EditableTextClient.tsx`, `EditableImageClient.tsx`, `EditableLinkClient.tsx` (check `useTrack` imports)

Run `grep -rn '@/lib/analytics' apps/kaffe/lib/cms apps/kaffe/app/cms apps/kaffe/app/auth` to find them all.

Replace `captureServerEvent(EVENTS.X, …)` calls with `getCmsLogger().captureServerEvent("admin_signed_in", …)` (pass the event name as a string literal — the logger is type-erased at the boundary on purpose; analytics retains its typed events internally).

Do NOT rename the event strings — they must match `EVENTS.*` string values in `apps/kaffe/lib/analytics/events.ts` so PostHog dashboards keep working. Read that file first to learn each event's string value, then hardcode the literal.

For the client editors, if they use a `useTrack` hook, do the equivalent inversion: expose a `setClientLogger` / `getClientLogger` in a new `apps/kaffe/lib/cms/client-logger.ts`, or — simpler — leave the client editors' tracking calls in place for now and handle them in Phase C when analytics becomes a package (the cycle is a server-side concern primarily). Your call; document whichever route you take.

## B3. Invert the analytics → cms direction

Open `apps/kaffe/lib/analytics/server/analytics-context.ts`. It currently imports `getSiteId` and/or the Supabase client factory from `@/lib/cms/...`. Replace those imports with a resolver interface:

```ts
// apps/kaffe/lib/analytics/server/analytics-context.ts
export type AnalyticsContextResolver = {
  getSiteId(): Promise<string>;
  // include any other cms-side helpers this file currently calls
};

let resolver: AnalyticsContextResolver | null = null;
export function setAnalyticsContextResolver(r: AnalyticsContextResolver): void {
  resolver = r;
}
function required(): AnalyticsContextResolver {
  if (!resolver) throw new Error("setAnalyticsContextResolver not called");
  return resolver;
}

// rewrite getAnalyticsContext() to use required().getSiteId() etc.
```

Read the file first to understand exactly which cms symbols it uses; the resolver type surface is whatever those are.

## B4. Wire both injections at app boot

Create `apps/kaffe/instrumentation.ts` (Next 16 runs this once on server start — verify in `apps/kaffe/node_modules/next/dist/docs/` before relying on this; if instrumentation.ts isn't the right hook in 16.x, fall back to registering in `apps/kaffe/app/layout.tsx` at module top-level):

```ts
// apps/kaffe/instrumentation.ts
export async function register() {
  const { setCmsLogger } = await import("@/lib/cms/logger");
  const { captureServerEvent } = await import("@/lib/analytics/posthog-server");
  setCmsLogger({ captureServerEvent });

  const { setAnalyticsContextResolver } = await import("@/lib/analytics/server/analytics-context");
  const { getSiteId } = await import("@/lib/cms/server/site");
  setAnalyticsContextResolver({ getSiteId });
}
```

Adjust the imports to match what you put in `lib/cms/logger.ts` and what symbols `analytics-context.ts` actually needs.

## B5. Smoke test (required before commit)

1. `bun --cwd apps/kaffe dev` — boots cleanly, no `Module not found`.
2. Load `/` on `localhost:3000`. Page renders.
3. `/cms/login` — submit bad creds, see inline error. Submit good creds, redirected to `/`, `cms-edit` cookie set.
4. Confirm in PostHog that `admin_signed_in` event fired with the correct `site_id`.
5. Enter edit mode, edit a text field, save. Refresh — new value persists. `cms_content_updated` event fires.
6. Sign out — cookie cleared.
7. `/auth/callback?code=...` error paths still redirect correctly (inspect the redirect URL).
8. `grep -rn '@/lib/analytics' apps/kaffe/lib/cms apps/kaffe/app/cms apps/kaffe/app/auth` returns empty (or only the intentional `client-logger` path if you kept one).

## B6. Commit

```
Phase B: decouple cms and analytics via injected logger + context resolver

CMS no longer imports analytics; analytics no longer imports cms. Both are
wired together at app boot via instrumentation.ts. Prepares the code for
extraction into separate workspace packages.
```

---

# Phase C — extract `packages/analytics`

## C1. Create the package scaffold

- `packages/analytics/package.json`:
  ```json
  {
    "name": "@autosites/analytics",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "exports": {
      "./server": "./src/server/index.ts",
      "./client": "./src/client/index.ts",
      "./events": "./src/events.ts",
      "./cms-logger": "./src/cms-logger.ts"
    },
    "peerDependencies": {
      "next": "^16",
      "react": "^19",
      "react-dom": "^19"
    },
    "dependencies": {
      "posthog-js": "^1.369.3",
      "posthog-node": "^5.29.2"
    }
  }
  ```
- `packages/analytics/tsconfig.json` extending a new `tsconfig.base.json` at repo root (create that too — copy the compilerOptions from `apps/kaffe/tsconfig.json` minus `plugins` and `paths`).

## C2. Move files

Move `apps/kaffe/lib/analytics/*` → `packages/analytics/src/*`. Suggested layout:

- `src/server/index.ts` — re-export `AnalyticsBoot`, `captureServerEvent`, `analytics-context` (`setAnalyticsContextResolver`, `getAnalyticsContext`)
- `src/client/index.ts` — re-export `PostHogProvider`, `PageView`, `useTrack`
- `src/events.ts` — the `EVENTS` constant
- `src/cms-logger.ts` — NEW: exports `cmsLogger: CmsLogger` adapting `captureServerEvent(EVENTS.X, …)` to the generic logger interface. Type the `event: string` param and internally narrow to `EventName` with a lookup table.

Rewrite all internal `@/lib/analytics/...` imports inside the package to relative.

## C3. Wire kaffe to the package

- `apps/kaffe/package.json`: add `"@autosites/analytics": "workspace:*"` to `dependencies`.
- `apps/kaffe/next.config.ts`: add `transpilePackages: ["@autosites/analytics"]`.
- Replace every `@/lib/analytics/...` import inside kaffe with `@autosites/analytics/...`:
  - `@/lib/analytics/AnalyticsBoot` → `@autosites/analytics/server`
  - `@/lib/analytics/posthog-server` → `@autosites/analytics/server`
  - `@/lib/analytics/events` → `@autosites/analytics/events`
  - `@/lib/analytics/client/PageView` → `@autosites/analytics/client`
  - etc.
- Update `instrumentation.ts` from Phase B to import from `@autosites/analytics/*` instead of `@/lib/analytics/*`. Also replace the custom logger-init with `import { cmsLogger } from "@autosites/analytics/cms-logger"; setCmsLogger(cmsLogger);`.
- Delete `apps/kaffe/lib/analytics/` (all contents moved).

## C4. Install, smoke-test, commit

1. `bun install` at repo root. Confirm `apps/kaffe/node_modules/@autosites/analytics` is a symlink to `packages/analytics`.
2. Full smoke test from B5 again. PostHog events must still fire with correct `site_id`.
3. Commit.

---

# Phase D — extract `packages/cms`

## D1. Create the package scaffold

- `packages/cms/package.json`:
  ```json
  {
    "name": "@autosites/cms",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "exports": {
      "./admin/login/page": "./src/admin/login/page.tsx",
      "./admin/edit": "./src/admin/edit/index.ts",
      "./admin/auth-callback": "./src/admin/auth-callback/index.ts",
      "./proxy": "./src/proxy.ts",
      "./components": "./src/components/index.ts",
      "./server": "./src/server/index.ts",
      "./server/site": "./src/server/site.ts",
      "./server/supabase": "./src/server/supabase.ts",
      "./logger": "./src/logger.ts",
      "./types": "./src/types.ts"
    },
    "peerDependencies": {
      "next": "^16",
      "react": "^19",
      "react-dom": "^19"
    },
    "dependencies": {
      "@supabase/ssr": "^0.10.2",
      "@supabase/supabase-js": "^2.103.2"
    }
  }
  ```
  **Note:** no dependency on `@autosites/analytics`. The logger is injected.
- `packages/cms/tsconfig.json` extending `tsconfig.base.json`.

## D2. Move files

Sources (from `apps/kaffe/`) → destinations (in `packages/cms/`):

- `lib/cms/logger.ts` → `src/logger.ts`
- `lib/cms/types.ts` → `src/types.ts`
- `lib/cms/index.ts` → delete (replaced by subpath exports)
- `lib/cms/server/*.ts` → `src/server/*.ts` (actions, auth, content, mode, site, supabase)
- `lib/cms/components/*.tsx` → `src/components/*.tsx` (EditableText, EditableImage, EditableLink, EditableProvider, CmsFooterAdminLink) + create `src/components/index.ts` barrel that re-exports them
- `lib/cms/client/*` → `src/client/*` (EditableTextClient, EditableImageClient, EditableLinkClient, EditableProvider, Toast, editable.css)
- `lib/cms/schema/*.sql` → `packages/cms/sql/*.sql` (package-local, NOT in src/ — not compiled, just shipped)
- `lib/cms/CMS.md` → `packages/cms/CMS.md`

Admin routes (these stop being in the app):

- `apps/kaffe/app/cms/login/page.tsx` → `packages/cms/src/admin/login/page.tsx`
- `apps/kaffe/app/cms/login/login-form.tsx` → `packages/cms/src/admin/login/login-form.tsx`
- `apps/kaffe/app/cms/login/actions.ts` → `packages/cms/src/admin/login/actions.ts`
- `apps/kaffe/app/cms/edit/route.ts` → `packages/cms/src/admin/edit/index.ts` (file exports `GET`)
- `apps/kaffe/app/auth/callback/route.ts` → `packages/cms/src/admin/auth-callback/index.ts` (file exports `GET`)

Middleware → proxy (handle the Next 16 rename):

- Read `apps/kaffe/node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` AND search the docs dir for "proxy" to confirm the new file-convention name and API. Expected: `proxy.ts` at app root exporting `proxy` (not `middleware`) and `config`.
- Move the body of `apps/kaffe/middleware.ts` → `packages/cms/src/proxy.ts`, renaming the exported function per the new convention.
- This subpath MUST only import `@supabase/ssr` + `next/server`. No cms-server-actions import, no logger call (keep it minimal for Edge runtime). If you need analytics events in the proxy layer, skip them — the existing middleware didn't track events and doesn't need to.

Rewrite all internal imports inside the package to relative (no `@/`).

## D3. Wire kaffe to the package

- `apps/kaffe/package.json`: add `"@autosites/cms": "workspace:*"`.
- `apps/kaffe/next.config.ts`: add `"@autosites/cms"` to `transpilePackages`.
- Create thin re-export stubs in kaffe:

  `apps/kaffe/app/cms/login/page.tsx`:
  ```ts
  export { default, metadata } from "@autosites/cms/admin/login/page";
  ```

  `apps/kaffe/app/cms/edit/route.ts`:
  ```ts
  export { GET } from "@autosites/cms/admin/edit";
  ```

  `apps/kaffe/app/auth/callback/route.ts`:
  ```ts
  export { GET } from "@autosites/cms/admin/auth-callback";
  ```

  `apps/kaffe/proxy.ts` (NEW, replaces `middleware.ts`):
  ```ts
  export { proxy, config } from "@autosites/cms/proxy";
  ```
  Then `rm apps/kaffe/middleware.ts`.

- Update every `@/lib/cms/...` import in kaffe (app/, components/, instrumentation.ts) to `@autosites/cms/...`. Find with `grep -rn '@/lib/cms' apps/kaffe`.
- Delete `apps/kaffe/lib/cms/` entirely.

## D4. Install, smoke-test, commit

1. `bun install`. Confirm symlink exists.
2. Re-run full smoke test from B5.
3. **Also test:** visit a page that uses an `EditableText`, enter edit mode, click the text, edit it, save. Confirm Server Action runs (no "unknown server action" error). This is the critical Server-Actions-in-package test.
4. `bun --cwd apps/kaffe build` succeeds. Inspect output for Edge runtime warnings on proxy.
5. Commit.

---

# Phase E — extract `packages/site-shell`

## E1. Create the package

- `packages/site-shell/package.json`:
  ```json
  {
    "name": "@autosites/site-shell",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "exports": {
      "./SiteShell": "./src/SiteShell.tsx",
      "./next-config": "./src/next-config.ts"
    },
    "peerDependencies": {
      "next": "^16",
      "react": "^19",
      "react-dom": "^19",
      "@autosites/cms": "workspace:*",
      "@autosites/analytics": "workspace:*"
    }
  }
  ```
- `packages/site-shell/src/SiteShell.tsx`:
  ```tsx
  import { Suspense, type ReactNode } from "react";
  import { AnalyticsBoot } from "@autosites/analytics/server";
  import { EditableProvider } from "@autosites/cms/components";

  export function SiteShell({ children }: { children: ReactNode }) {
    return (
      <Suspense fallback={null}>
        <AnalyticsBoot>
          <EditableProvider>{children}</EditableProvider>
        </AnalyticsBoot>
      </Suspense>
    );
  }
  ```
- `packages/site-shell/src/next-config.ts` — data-only, no Node imports:
  ```ts
  export const sharedImagePatterns = [
    { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
  ] as const;

  export const sharedRewrites = [
    { source: "/load-content/static/:path*", destination: "https://eu-assets.i.posthog.com/static/:path*" },
    { source: "/load-content/:path*", destination: "https://eu.i.posthog.com/:path*" },
    { source: "/load-content/decide", destination: "https://eu.i.posthog.com/decide" },
  ] as const;
  ```

## E2. Update kaffe's layout + next.config

- `apps/kaffe/app/layout.tsx`: keep the `next/font` calls, replace the Suspense/AnalyticsBoot/EditableProvider block with `<SiteShell>{children}</SiteShell>`. Import from `@autosites/site-shell/SiteShell`.
- `apps/kaffe/next.config.ts`: import shared data and spread:
  ```ts
  import { sharedImagePatterns, sharedRewrites } from "@autosites/site-shell/next-config";
  // ...
  const nextConfig: NextConfig = {
    cacheComponents: true,
    skipTrailingSlashRedirect: true,
    images: { remotePatterns: [...sharedImagePatterns] },
    async rewrites() { return [...sharedRewrites]; },
  };
  ```
  Also add `"@autosites/site-shell"` to `transpilePackages`.
- Add `"@autosites/site-shell": "workspace:*"` to `apps/kaffe/package.json`.

## E3. Install, smoke-test, commit

Same smoke test as before. Visual output must be unchanged from Phase D.

---

# Phase F — scaffolder + second app

## F1. Write `scripts/create-site.ts` (at repo root)

Invocation: `bun scripts/create-site.ts <slug> [--blank] [--theme=kaffe] [--host=localhost:3001] [--port=3001] [--db]`

Behavior:

1. Parse args. Validate `slug` matches `/^[a-z][a-z0-9-]{1,30}$/` and `apps/<slug>` does not exist.
2. Auto-pick port: max existing app port (from each `apps/*/package.json` dev script) + 1, default 3001.
3. Scaffold `apps/<slug>/` with:
   - `package.json`: `"name": "@autosites/site-<slug>"`, `"type": "module"`, scripts (`dev --port <n>`, `build`, `start`, `lint`, `cms:pull`, `cms:push`), deps:
     - `@autosites/cms`, `@autosites/analytics`, `@autosites/site-shell`: `workspace:*`
     - Runtime peers: `next ^16`, `react ^19`, `react-dom ^19`, `@supabase/ssr`, `@supabase/supabase-js`, `posthog-js`, `posthog-node`
     - Dev: match kaffe's devDependencies
   - `tsconfig.json`: copy kaffe's
   - `next.config.ts`: imports shared config from `@autosites/site-shell/next-config`, sets `transpilePackages: ["@autosites/cms","@autosites/analytics","@autosites/site-shell"]`, `cacheComponents: true`
   - `proxy.ts`: `export { proxy, config } from "@autosites/cms/proxy";`
   - `app/cms/login/page.tsx`, `app/cms/edit/route.ts`, `app/auth/callback/route.ts`: thin re-export stubs (same as kaffe's from D3)
   - `instrumentation.ts`: wires `setCmsLogger(cmsLogger)` + `setAnalyticsContextResolver({ getSiteId })` (copy kaffe's exactly)
   - `app/layout.tsx`:
     - **themed**: copy kaffe's — `next/font` for Inter + EB Garamond, metadata templated to the new slug, `<SiteShell>` wrapper
     - **blank**: same structure but fonts can be omitted (use system-ui) and metadata is a placeholder
   - `app/page.tsx`:
     - **themed**: copy from kaffe with component imports rewritten from `@/components/kaffe/...` to `@/components/<theme>/...`
     - **blank**: `<main style={{ padding: "4rem" }}>Hello, <slug></main>` — no component imports
   - `app/globals.css`:
     - **themed**: copy kaffe's
     - **blank**: minimal reset + `@import "tailwindcss";` + `:root { --bg: #fff; --text: #111; }` so login/edit UI renders sanely
   - `components/<theme>/*`:
     - **themed**: copy from `apps/kaffe/components/kaffe/`
     - **blank**: folder omitted (app has no theme components)
   - `public/`: empty (or favicon.ico from kaffe for themed)
   - `postcss.config.mjs`, `eslint.config.mjs`: copy kaffe's
   - `.env.local.example`:
     ```
     NEXT_PUBLIC_SUPABASE_URL=
     NEXT_PUBLIC_SUPABASE_ANON_KEY=
     SUPABASE_SERVICE_ROLE_KEY=
     NEXT_PUBLIC_POSTHOG_KEY=
     NEXT_PUBLIC_POSTHOG_HOST=
     ```
4. If `--db`: connect via service-role Supabase client, insert into `sites` (slug, name=slug-capitalized) and `site_hosts` (host, site_id). Else: print the required SQL to stdout.
5. Run `bun install` at root to wire workspace symlinks.
6. Print next steps: `cp apps/<slug>/.env.local.example apps/<slug>/.env.local`, fill vars, run DB SQL (if `--db` not used), `bun --cwd apps/<slug> dev`.

The script should be idempotent-ish: bail out cleanly if `apps/<slug>` exists. Use Bun's built-in APIs (`Bun.write`, `Bun.file`, `Bun.$`) rather than pulling in commander/yargs — keep it dependency-free.

## F2. Test

1. `bun scripts/create-site.ts demo --host=localhost:3001`. Expect a full `apps/demo/` tree, themed from kaffe.
2. Register `demo` in DB: insert into `sites` and `site_hosts` (or pass `--db`).
3. Fill `apps/demo/.env.local` with the same Supabase vars as kaffe.
4. `bun --cwd apps/demo dev`. Page renders on 3001.
5. Run the full smoke test from B5 on `localhost:3001`. Events in PostHog must show demo's `site_id`, not kaffe's.
6. Edit CMS content on demo — confirm kaffe content on `localhost:3000` is unaffected (tenant isolation).
7. `bun scripts/create-site.ts blank-demo --blank --host=localhost:3002`. `apps/blank-demo/app/page.tsx` renders "Hello, blank-demo". `/cms/login` still works (shared infra). No `components/<theme>/` directory.
8. **Single-source verification:** edit `packages/cms/src/components/EditableText.tsx` cosmetically. Restart both `demo` and `blank-demo` dev servers. Both pick up the change.
9. **Regression gate:** `git diff HEAD~N apps/kaffe/components/kaffe/` between pre-Phase-A and post-Phase-F shows zero changes (where N is the number of phase commits).

## F3. Commit

Then delete `MIGRATION.md` and the `/coffeShopTest/` gitignore entry (Phase A's harness workaround is no longer needed in a fresh session). Commit that cleanup separately.

---

## File map reference

Pre-extraction (current state):
- [apps/kaffe/lib/cms/](apps/kaffe/lib/cms/) — the CMS library
- [apps/kaffe/lib/analytics/](apps/kaffe/lib/analytics/) — the analytics library
- [apps/kaffe/app/cms/login/](apps/kaffe/app/cms/login/), [apps/kaffe/app/cms/edit/route.ts](apps/kaffe/app/cms/edit/route.ts), [apps/kaffe/app/auth/callback/route.ts](apps/kaffe/app/auth/callback/route.ts) — admin routes
- [apps/kaffe/middleware.ts](apps/kaffe/middleware.ts) — to be renamed to `proxy.ts` in Phase D

Post-extraction targets:
- `packages/cms/src/{admin,components,server,client}/`, `packages/cms/src/{logger,types,proxy}.ts`, `packages/cms/sql/`
- `packages/analytics/src/{server,client,events,cms-logger}.ts`
- `packages/site-shell/src/{SiteShell.tsx,next-config.ts}`
- `scripts/create-site.ts`

## Verification checklist (use every phase)

1. `bun install` at repo root — clean, no blocking peer warnings
2. `bun --cwd apps/kaffe dev` boots cleanly
3. Visit `/` — page renders, fonts present in `<html>` className, images load
4. `/cms/login` — bad creds show inline error; good creds set `cms-edit` cookie and emit `admin_signed_in` in PostHog with correct `site_id`
5. Enter edit mode, edit a text field, save — `cms_content_updated` event fires, refresh shows new value
6. Sign out — cookie cleared, edit UI gone
7. `bun --cwd apps/kaffe build` succeeds with no Edge runtime errors (after Phase D)
8. `bun --cwd apps/kaffe cms:pull --site kaffe` still works
9. `grep -rn '@/lib/' apps/kaffe` after Phase D returns empty (all moved to `@autosites/*`)

## Safety rails

- Never commit without running at minimum steps 1–3 of the verification checklist.
- If a phase breaks kaffe, `git reset --hard HEAD` and restart the phase — each phase is supposed to leave kaffe working.
- Don't touch `mapsLeadsFetcher/`.
- Don't add a build step to packages. Ever.
- Don't amend commits. Create new ones.
- The user prefers no `Co-Authored-By` trailer on commits.
