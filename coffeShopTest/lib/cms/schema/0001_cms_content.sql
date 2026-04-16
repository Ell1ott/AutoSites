-- CMS content storage + admin membership, with RLS.
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create table if not exists public.cms_content (
  key        text primary key,
  kind       text not null check (kind in ('text', 'image', 'link')),
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.cms_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.cms_content enable row level security;
alter table public.cms_admins  enable row level security;

-- Public reads: the content is rendered on a public site, so anyone can read.
drop policy if exists "cms_content read" on public.cms_content;
create policy "cms_content read"
  on public.cms_content
  for select
  using (true);

-- Writes: only members of cms_admins.
drop policy if exists "cms_content write" on public.cms_content;
create policy "cms_content write"
  on public.cms_content
  for all
  to authenticated
  using (exists (select 1 from public.cms_admins where user_id = auth.uid()))
  with check (exists (select 1 from public.cms_admins where user_id = auth.uid()));

-- Admins can see their own membership row (used server-side to check admin status).
drop policy if exists "cms_admins self-read" on public.cms_admins;
create policy "cms_admins self-read"
  on public.cms_admins
  for select
  to authenticated
  using (user_id = auth.uid());

-- Keep updated_at honest.
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
