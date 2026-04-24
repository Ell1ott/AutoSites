# CMS — minimal integration

**Prereqs:** Copy `lib/cms`, `app/cms/*`, `middleware.ts` (or merge its Supabase session + `?edit=` handling). Apply `lib/cms/schema/*.sql`, create Storage bucket `cms-images` per `0002_storage.sql`. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Seed `sites`, `site_hosts` (your domain → `site_id`), `cms_admins` (your user id). `next.config`: `images.remotePatterns` for Supabase storage host if you use `EditableImage` with remote URLs.

**Layout:** Wrap app in `<Suspense><EditableProvider /></Suspense>`; import from `@/lib/cms/components/EditableProvider` (not `@/lib/cms`).

**Replace static UI:** In server components, swap copy/images/links for:

- `EditableText` — `cmsKey`, `fallback="..."` (optional `<b>`, `<i>`, `<br>` when not editing)
- `EditableImage` — `cmsKey`, `fallback={{ src, alt }}` (+ `width`/`height`/`fill`/`sizes`/`priority` as needed)
- `EditableLink` — `cmsKey`, `fallback={{ href, label }}`  
  Custom `children={(label) => ...}` only works when **not** in edit mode.

**Admin:** Add `<CmsFooterAdminLink />` (or link to `/cms/login` then `/cms/edit`). Edit mode = `cms-edit` cookie **and** user in `cms_admins` for this site. Quick toggle: `?edit=1` / `?edit=0`.

**Keys:** Stable dotted names, one key per field (`page.section.field`, ≤200 chars).

**Optional:** `bun cms:push --site <slug>` / `cms:pull` to sync TSX fallbacks ↔ DB (`SUPABASE_SERVICE_ROLE_KEY` for push).

**Don’t:** Import `*Client` components directly — always the `Editable*` server wrappers.
