-- Run against your Supabase DB if `cms_admins.code` does not exist yet.
alter table public.cms_admins add column if not exists code text;

create unique index if not exists cms_admins_code_key on public.cms_admins (code)
  where code is not null;
