-- Multi-site CMS schema: sites, cms_content, cms_admins + RLS.
-- Each site is identified by a unique slug; the running app picks its site
-- via the SITE_SLUG env var.

-- Sites
create table if not exists public.sites (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  created_at timestamptz not null default now()
);

alter table public.sites enable row level security;

drop policy if exists "sites public read" on public.sites;
create policy "sites public read"
  on public.sites for select using (true);

-- CMS content, scoped per site
create table if not exists public.cms_content (
  site_id    uuid not null references public.sites(id) on delete cascade,
  key        text not null,
  kind       text not null check (kind in ('text', 'image', 'link')),
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (site_id, key)
);

-- Admin membership, scoped per site (N:M)
create table if not exists public.cms_admins (
  user_id    uuid not null references auth.users(id) on delete cascade,
  site_id    uuid not null references public.sites(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, site_id)
);

alter table public.cms_content enable row level security;
alter table public.cms_admins  enable row level security;

-- Public reads
drop policy if exists "cms_content read" on public.cms_content;
create policy "cms_content read"
  on public.cms_content for select using (true);

-- Writes: only admins of the same site
drop policy if exists "cms_content write" on public.cms_content;
create policy "cms_content write"
  on public.cms_content
  for all
  to authenticated
  using  (exists (select 1 from public.cms_admins where user_id = auth.uid() and site_id = cms_content.site_id))
  with check (exists (select 1 from public.cms_admins where user_id = auth.uid() and site_id = cms_content.site_id));

-- Admins can see their own membership rows
drop policy if exists "cms_admins self-read" on public.cms_admins;
create policy "cms_admins self-read"
  on public.cms_admins for select to authenticated
  using (user_id = auth.uid());

-- Keep updated_at honest
create or replace function public.cms_content_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists cms_content_touch on public.cms_content;
create trigger cms_content_touch
  before update on public.cms_content
  for each row
  execute function public.cms_content_touch_updated_at();
