-- Seed the Kaffe&mere site and its content.
-- Uses `on conflict ... do nothing` so re-running is safe.

-- Site
insert into public.sites (id, slug, name)
values ('11111111-1111-1111-1111-111111111111', 'kaffemere', 'Kaffe&mere')
on conflict (id) do nothing;

-- Content (all scoped to the kaffemere site)
insert into public.cms_content (site_id, key, kind, value) values
  -- Brand
  ('11111111-1111-1111-1111-111111111111', 'site.brand.name',      'text', jsonb_build_object('text', 'Kaffe&mere')),
  ('11111111-1111-1111-1111-111111111111', 'site.brand.shortName', 'text', jsonb_build_object('text', 'K&M')),

  -- Nav
  ('11111111-1111-1111-1111-111111111111', 'nav.1', 'link', jsonb_build_object('href', '#', 'label', 'The Brew')),
  ('11111111-1111-1111-1111-111111111111', 'nav.2', 'link', jsonb_build_object('href', '#', 'label', 'Spaces')),
  ('11111111-1111-1111-1111-111111111111', 'nav.3', 'link', jsonb_build_object('href', '#', 'label', 'Ethics')),
  ('11111111-1111-1111-1111-111111111111', 'nav.4', 'link', jsonb_build_object('href', '#', 'label', 'Visit')),

  -- Hero
  ('11111111-1111-1111-1111-111111111111', 'home.hero.title',   'text', jsonb_build_object('text', 'Quietude in every pour.')),
  ('11111111-1111-1111-1111-111111111111', 'home.hero.eyebrow', 'text', jsonb_build_object('text', 'Est. 2024 — Copenhagen')),
  ('11111111-1111-1111-1111-111111111111', 'home.hero.lede',    'text', jsonb_build_object('text',
    'A curated ritual of slow-living through the lens of specialty coffee and architectural stillness.')),
  ('11111111-1111-1111-1111-111111111111', 'home.hero.cta',     'link', jsonb_build_object('href', '#', 'label', 'Reserve a Table')),
  ('11111111-1111-1111-1111-111111111111', 'home.hero.image',   'image', jsonb_build_object(
    'src', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2070',
    'alt', 'Interior')),

  -- Collection section
  ('11111111-1111-1111-1111-111111111111', 'home.collection.label.left',  'text', jsonb_build_object('text', 'The Collection')),
  ('11111111-1111-1111-1111-111111111111', 'home.collection.label.right', 'text', jsonb_build_object('text', '01 / 03')),

  -- Menu item 001
  ('11111111-1111-1111-1111-111111111111', 'menu.001.code',        'text', jsonb_build_object('text', '001')),
  ('11111111-1111-1111-1111-111111111111', 'menu.001.title',       'text', jsonb_build_object('text', 'Origin V60')),
  ('11111111-1111-1111-1111-111111111111', 'menu.001.description', 'text', jsonb_build_object('text',
    'Notes of stone fruit, bergamot, and morning air.')),
  ('11111111-1111-1111-1111-111111111111', 'menu.001.image',       'image', jsonb_build_object(
    'src', 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=1000',
    'alt', 'V60')),

  -- Menu item 002
  ('11111111-1111-1111-1111-111111111111', 'menu.002.code',        'text', jsonb_build_object('text', '002')),
  ('11111111-1111-1111-1111-111111111111', 'menu.002.title',       'text', jsonb_build_object('text', 'Dark Matter')),
  ('11111111-1111-1111-1111-111111111111', 'menu.002.description', 'text', jsonb_build_object('text',
    'Viscous, velvety, with a lingering cocoa finish.')),
  ('11111111-1111-1111-1111-111111111111', 'menu.002.image',       'image', jsonb_build_object(
    'src', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=1000',
    'alt', 'Espresso')),

  -- Menu item 003
  ('11111111-1111-1111-1111-111111111111', 'menu.003.code',        'text', jsonb_build_object('text', '003')),
  ('11111111-1111-1111-1111-111111111111', 'menu.003.title',       'text', jsonb_build_object('text', 'Still Cold')),
  ('11111111-1111-1111-1111-111111111111', 'menu.003.description', 'text', jsonb_build_object('text',
    'Steeped for 18 hours in stone crocks.')),
  ('11111111-1111-1111-1111-111111111111', 'menu.003.image',       'image', jsonb_build_object(
    'src', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=1000',
    'alt', 'Cold Brew')),

  -- Philosophy
  ('11111111-1111-1111-1111-111111111111', 'home.philosophy.label', 'text', jsonb_build_object('text', 'Our Philosophy')),
  ('11111111-1111-1111-1111-111111111111', 'home.philosophy.quote', 'text', jsonb_build_object('text',
    '"We believe that a space should breathe as deeply as those within it."')),

  -- Space
  ('11111111-1111-1111-1111-111111111111', 'home.space.label',   'text', jsonb_build_object('text', 'Space')),
  ('11111111-1111-1111-1111-111111111111', 'home.space.heading', 'text', jsonb_build_object('text', 'Materials of Rest.')),
  ('11111111-1111-1111-1111-111111111111', 'home.space.body',    'text', jsonb_build_object('text',
    'Our flagship store utilizes reclaimed oak beams and hand-applied lime wash to create a sensory vacuum.')),
  ('11111111-1111-1111-1111-111111111111', 'home.space.image',   'image', jsonb_build_object(
    'src', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=2047',
    'alt', 'Cafe space')),

  -- Footer
  ('11111111-1111-1111-1111-111111111111', 'footer.inquiry.heading', 'text', jsonb_build_object('text', 'Inquiry')),
  ('11111111-1111-1111-1111-111111111111', 'footer.inquiry.email',   'text', jsonb_build_object('text', 'hej@kaffemere.dk')),
  ('11111111-1111-1111-1111-111111111111', 'footer.inquiry.phone',   'text', jsonb_build_object('text', '+45 20 30 40 50')),
  ('11111111-1111-1111-1111-111111111111', 'footer.address.heading', 'text', jsonb_build_object('text', 'Address')),
  ('11111111-1111-1111-1111-111111111111', 'footer.address.line1',   'text', jsonb_build_object('text', 'Gothersgade 12')),
  ('11111111-1111-1111-1111-111111111111', 'footer.address.line2',   'text', jsonb_build_object('text', '1123 København K')),
  ('11111111-1111-1111-1111-111111111111', 'footer.address.line3',   'text', jsonb_build_object('text', 'Denmark')),
  ('11111111-1111-1111-1111-111111111111', 'footer.copy',            'text', jsonb_build_object('text', '© 2024 Kaffe&mere. A study in stillness.'))
on conflict (site_id, key) do nothing;
