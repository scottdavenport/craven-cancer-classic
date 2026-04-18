-- Seed data for Craven Cancer Classic

-- Event settings for 2026
insert into public.event_settings (name, location, description, morning_cap, afternoon_cap, registration_open, year)
values (
  'Craven Cancer Classic',
  'New Bern Golf & Country Club',
  'Remembering those who have lost their battle, supporting those who continue their fight! Honoring Scott Davenport Sr., Brian Fisher & John Aylward.',
  36,
  36,
  false,
  2026
);

-- Sponsorship items — 8 canonical levels for 2026 (canonical names approved by Scott)
insert into public.sponsorship_items (name, price_cents, sort_order, benefits, active, year, max_quantity) values
  ('Champion Sponsor',  500000, 10, '["Premier signage at event", "Recognition on website", "4 complimentary teams"]'::jsonb, true, 2026, NULL),
  ('Eagle Sponsor',     250000, 20, '["Prominent signage at event", "Recognition on website", "2 complimentary teams"]'::jsonb, true, 2026, NULL),
  ('Golf Gift Sponsor', 250000, 30, '["Logo on golf gifts", "Recognition on website"]'::jsonb, true, 2026, NULL),
  ('Celebration Lunch', 200000, 40, '["Signage at lunch", "Recognition on website"]'::jsonb, true, 2026, NULL),
  ('Golf Carts',        100000, 50, '["Logo on golf carts", "Recognition on website"]'::jsonb, true, 2026, NULL),
  ('Bloody Mary',       100000, 60, '["Signage at Bloody Mary bar", "Recognition on website"]'::jsonb, true, 2026, NULL),
  ('Thursday Night',     70000, 70, '["Signage at Thursday night event", "Recognition on website"]'::jsonb, true, 2026, NULL),
  ('Wall Sponsor',       70000, 80, '["Name on sponsor wall", "Recognition on website"]'::jsonb, true, 2026, NULL)
on conflict (name, year) do nothing;
