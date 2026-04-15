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

-- Sponsor tiers (from current site pricing)
insert into public.sponsor_tiers (name, price, sort_order, benefits) values
  ('Champion Sponsor', 5000.00, 1, '["Premier signage at event", "Recognition on website", "4 complimentary teams"]'::jsonb),
  ('Eagle Sponsor', 2500.00, 2, '["Prominent signage at event", "Recognition on website", "2 complimentary teams"]'::jsonb),
  ('Golf Gift Sponsor', 2500.00, 3, '["Logo on golf gifts", "Recognition on website"]'::jsonb),
  ('Celebration Lunch', 2000.00, 4, '["Signage at lunch", "Recognition on website"]'::jsonb),
  ('Golf Cart Sponsor', 1000.00, 5, '["Logo on golf carts", "Recognition on website"]'::jsonb),
  ('Bloody Mary Sponsor', 1000.00, 6, '["Signage at Bloody Mary bar", "Recognition on website"]'::jsonb),
  ('Thursday Night Sponsor', 700.00, 7, '["Signage at Thursday night event", "Recognition on website"]'::jsonb),
  ('Wall Sponsor', 700.00, 8, '["Name on sponsor wall", "Recognition on website"]'::jsonb);
