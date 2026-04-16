-- Seed every editable element on the Kaffe&mere homepage with its current
-- design-time value. Run in the Supabase SQL editor after the two migrations.
-- Uses `on conflict (key) do nothing` so re-running is safe.

insert into public.cms_content (key, kind, value) values
  -- Brand
  ('site.brand.name',      'text', jsonb_build_object('text', 'Kaffe&mere')),
  ('site.brand.shortName', 'text', jsonb_build_object('text', 'K&M')),

  -- Nav
  ('nav.1', 'link', jsonb_build_object('href', '#', 'label', 'The Brew')),
  ('nav.2', 'link', jsonb_build_object('href', '#', 'label', 'Spaces')),
  ('nav.3', 'link', jsonb_build_object('href', '#', 'label', 'Ethics')),
  ('nav.4', 'link', jsonb_build_object('href', '#', 'label', 'Visit')),

  -- Hero
  ('home.hero.title',   'text', jsonb_build_object('text', 'Quietude in every pour.')),
  ('home.hero.eyebrow', 'text', jsonb_build_object('text', 'Est. 2024 — Copenhagen')),
  ('home.hero.lede',    'text', jsonb_build_object('text',
    'A curated ritual of slow-living through the lens of specialty coffee and architectural stillness.')),
  ('home.hero.cta',     'link', jsonb_build_object('href', '#', 'label', 'Reserve a Table')),
  ('home.hero.image',   'image', jsonb_build_object(
    'src', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2070',
    'alt', 'Interior')),

  -- Collection section
  ('home.collection.label.left',  'text', jsonb_build_object('text', 'The Collection')),
  ('home.collection.label.right', 'text', jsonb_build_object('text', '01 / 03')),

  -- Menu item 001
  ('menu.001.code',        'text', jsonb_build_object('text', '001')),
  ('menu.001.title',       'text', jsonb_build_object('text', 'Origin V60')),
  ('menu.001.description', 'text', jsonb_build_object('text',
    'Notes of stone fruit, bergamot, and morning air.')),
  ('menu.001.image',       'image', jsonb_build_object(
    'src', 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=1000',
    'alt', 'V60')),

  -- Menu item 002
  ('menu.002.code',        'text', jsonb_build_object('text', '002')),
  ('menu.002.title',       'text', jsonb_build_object('text', 'Dark Matter')),
  ('menu.002.description', 'text', jsonb_build_object('text',
    'Viscous, velvety, with a lingering cocoa finish.')),
  ('menu.002.image',       'image', jsonb_build_object(
    'src', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=1000',
    'alt', 'Espresso')),

  -- Menu item 003
  ('menu.003.code',        'text', jsonb_build_object('text', '003')),
  ('menu.003.title',       'text', jsonb_build_object('text', 'Still Cold')),
  ('menu.003.description', 'text', jsonb_build_object('text',
    'Steeped for 18 hours in stone crocks.')),
  ('menu.003.image',       'image', jsonb_build_object(
    'src', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=1000',
    'alt', 'Cold Brew')),

  -- Philosophy
  ('home.philosophy.label', 'text', jsonb_build_object('text', 'Our Philosophy')),
  ('home.philosophy.quote', 'text', jsonb_build_object('text',
    '“We believe that a space should breathe as deeply as those within it.”')),

  -- Space
  ('home.space.label',   'text', jsonb_build_object('text', 'Space')),
  ('home.space.heading', 'text', jsonb_build_object('text', 'Materials of Rest.')),
  ('home.space.body',    'text', jsonb_build_object('text',
    'Our flagship store utilizes reclaimed oak beams and hand-applied lime wash to create a sensory vacuum.')),
  ('home.space.image',   'image', jsonb_build_object(
    'src', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=2047',
    'alt', 'Cafe space')),

  -- Footer
  ('footer.inquiry.heading', 'text', jsonb_build_object('text', 'Inquiry')),
  ('footer.inquiry.email',   'text', jsonb_build_object('text', 'hej@kaffemere.dk')),
  ('footer.inquiry.phone',   'text', jsonb_build_object('text', '+45 20 30 40 50')),
  ('footer.address.heading', 'text', jsonb_build_object('text', 'Address')),
  ('footer.address.line1',   'text', jsonb_build_object('text', 'Gothersgade 12')),
  ('footer.address.line2',   'text', jsonb_build_object('text', '1123 København K')),
  ('footer.address.line3',   'text', jsonb_build_object('text', 'Denmark')),
  ('footer.copy',            'text', jsonb_build_object('text', '© 2024 Kaffe&mere. A study in stillness.'))
on conflict (key) do nothing;
