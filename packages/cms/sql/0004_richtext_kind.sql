-- Add 'richText' to the allowed cms_content kinds. Rich-text rows store
-- multi-paragraph HTML produced by the Tiptap-based EditableRichText
-- component, in `value` jsonb as `{ "html": "...", "style"?: { ... } }`.

alter table public.cms_content
  drop constraint if exists cms_content_kind_check;

alter table public.cms_content
  add constraint cms_content_kind_check
  check (kind in ('text', 'image', 'link', 'list', 'richText'));
