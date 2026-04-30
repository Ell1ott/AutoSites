-- One-off rename of cafelucca dish keys.
--
-- The menu page now uses EditableList for burgers and pizzas, which keys
-- child fields under `menu.<section>.items.<id>.<field>`. Existing rows
-- live at `menu.dish.<n>.<field>` and are shared between burgers and
-- pizzas; this script splits them by id into the new namespaces.
--
-- Replace <CAFELUCCA_SITE_ID> with the actual site uuid before running.
-- (Find it via: select id from public.sites where slug = 'cafeluccas';)

begin;

-- Burgers: ids 97, 98, 99
update public.cms_content
   set key = replace(key, 'menu.dish.', 'menu.burgers.items.')
 where site_id = '<CAFELUCCA_SITE_ID>'
   and (
        key like 'menu.dish.97.%'
     or key like 'menu.dish.98.%'
     or key like 'menu.dish.99.%'
   );

-- Pizzas: ids 2, 3, 56
update public.cms_content
   set key = replace(key, 'menu.dish.', 'menu.pizzas.items.')
 where site_id = '<CAFELUCCA_SITE_ID>'
   and (
        key like 'menu.dish.2.%'
     or key like 'menu.dish.3.%'
     or key like 'menu.dish.56.%'
   );

-- Sanity check: should return 0 rows after the renames above.
-- select key from public.cms_content
--  where site_id = '<CAFELUCCA_SITE_ID>'
--    and key like 'menu.dish.%';

commit;
