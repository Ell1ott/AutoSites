-- Add 'list' to the allowed cms_content kinds. List rows store an ordered
-- array of item ids in their `value` jsonb (`{ "ids": ["..."] }`); each
-- item's actual content lives in normal text/image/link rows keyed
-- `${listKey}.${id}.${field}`.

alter table public.cms_content
  drop constraint if exists cms_content_kind_check;

alter table public.cms_content
  add constraint cms_content_kind_check
  check (kind in ('text', 'image', 'link', 'list'));
