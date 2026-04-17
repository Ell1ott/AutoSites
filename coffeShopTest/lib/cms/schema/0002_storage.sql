-- Public bucket for CMS-uploaded images (site-prefixed paths).
-- Run this AFTER 0001_cms_content.sql.

insert into storage.buckets (id, name, public)
values ('cms-images', 'cms-images', true)
on conflict (id) do nothing;

-- Anyone can read (bucket is public).
drop policy if exists "cms-images public read" on storage.objects;
create policy "cms-images public read"
  on storage.objects for select
  using (bucket_id = 'cms-images');

-- Only admins can upload — path must start with a site_id they're admin of.
drop policy if exists "cms-images admin insert" on storage.objects;
create policy "cms-images admin insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'cms-images'
    and exists (
      select 1 from public.cms_admins
      where user_id = auth.uid()
        and site_id = (split_part(name, '/', 1))::uuid
    )
  );

drop policy if exists "cms-images admin update" on storage.objects;
create policy "cms-images admin update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'cms-images'
    and exists (
      select 1 from public.cms_admins
      where user_id = auth.uid()
        and site_id = (split_part(name, '/', 1))::uuid
    )
  );

drop policy if exists "cms-images admin delete" on storage.objects;
create policy "cms-images admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'cms-images'
    and exists (
      select 1 from public.cms_admins
      where user_id = auth.uid()
        and site_id = (split_part(name, '/', 1))::uuid
    )
  );
