-- Craven Cancer Classic - Initial Database Schema
-- All core tables, RLS policies, and storage buckets

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES
-- ============================================
create table public.profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = auth_user_id);

create policy "Admins can manage all profiles"
  on public.profiles for all using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'admin'
    )
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (auth_user_id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- EVENT SETTINGS
-- ============================================
create table public.event_settings (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'Craven Cancer Classic',
  date date,
  location text not null default 'New Bern Golf & Country Club',
  description text,
  morning_slots int not null default 0,
  afternoon_slots int not null default 0,
  morning_cap int not null default 36,
  afternoon_cap int not null default 36,
  registration_open boolean not null default false,
  year int not null default extract(year from now()),
  hero_image_url text,
  updated_at timestamptz not null default now()
);

alter table public.event_settings enable row level security;

create policy "Event settings are viewable by everyone"
  on public.event_settings for select using (true);

create policy "Admins can manage event settings"
  on public.event_settings for all using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- SPONSOR TIERS
-- ============================================
create table public.sponsor_tiers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  price numeric(10,2) not null,
  sort_order int not null default 0,
  benefits jsonb not null default '[]'::jsonb,
  max_available int,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.sponsor_tiers enable row level security;

create policy "Sponsor tiers are viewable by everyone"
  on public.sponsor_tiers for select using (true);

create policy "Admins can manage sponsor tiers"
  on public.sponsor_tiers for all using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- SPONSORS
-- ============================================
create table public.sponsors (
  id uuid primary key default uuid_generate_v4(),
  tier_id uuid not null references public.sponsor_tiers(id) on delete restrict,
  name text not null,
  logo_url text,
  website text,
  contact_name text,
  contact_email text,
  contact_phone text,
  amount_paid numeric(10,2) not null default 0,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'comped')),
  stripe_payment_id text,
  display_order int not null default 0,
  year int not null default extract(year from now()),
  created_at timestamptz not null default now()
);

alter table public.sponsors enable row level security;

create policy "Sponsors are viewable by everyone"
  on public.sponsors for select using (true);

create policy "Admins can manage sponsors"
  on public.sponsors for all using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- TEAMS
-- ============================================
create table public.teams (
  id uuid primary key default uuid_generate_v4(),
  team_name text not null,
  captain_name text not null,
  captain_email text not null,
  captain_phone text,
  session text not null check (session in ('morning', 'afternoon')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'comped')),
  stripe_payment_id text,
  amount_paid numeric(10,2) not null default 0,
  notes text,
  year int not null default extract(year from now()),
  created_at timestamptz not null default now()
);

alter table public.teams enable row level security;

create policy "Admins can manage teams"
  on public.teams for all using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Anyone can register a team"
  on public.teams for insert with check (true);

create policy "Teams are viewable by admins"
  on public.teams for select using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- PLAYERS
-- ============================================
create table public.players (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  handicap int,
  created_at timestamptz not null default now()
);

alter table public.players enable row level security;

create policy "Admins can manage players"
  on public.players for all using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Anyone can add players during registration"
  on public.players for insert with check (true);

-- ============================================
-- SPONSORSHIP ITEMS
-- ============================================
create table public.sponsorship_items (
  id uuid primary key default uuid_generate_v4(),
  tier_id uuid references public.sponsor_tiers(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null,
  max_quantity int,
  sold_count int not null default 0,
  active boolean not null default true,
  year int not null default extract(year from now()),
  created_at timestamptz not null default now()
);

alter table public.sponsorship_items enable row level security;

create policy "Sponsorship items are viewable by everyone"
  on public.sponsorship_items for select using (true);

create policy "Admins can manage sponsorship items"
  on public.sponsorship_items for all using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- SPONSORSHIP PURCHASES
-- ============================================
create table public.sponsorship_purchases (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references public.sponsorship_items(id) on delete restrict,
  purchaser_name text not null,
  purchaser_email text not null,
  purchaser_phone text,
  company_name text,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'comped')),
  stripe_payment_id text,
  amount_paid numeric(10,2) not null default 0,
  year int not null default extract(year from now()),
  created_at timestamptz not null default now()
);

alter table public.sponsorship_purchases enable row level security;

create policy "Admins can manage sponsorship purchases"
  on public.sponsorship_purchases for all using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Anyone can make a sponsorship purchase"
  on public.sponsorship_purchases for insert with check (true);

-- ============================================
-- PHOTOS
-- ============================================
create table public.photos (
  id uuid primary key default uuid_generate_v4(),
  uploaded_by_name text not null,
  uploaded_by_email text,
  image_url text not null,
  caption text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  year int not null default extract(year from now()),
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

create policy "Approved photos are viewable by everyone"
  on public.photos for select using (status = 'approved');

create policy "Admins can view all photos"
  on public.photos for select using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can manage photos"
  on public.photos for all using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Anyone can upload photos"
  on public.photos for insert with check (true);

-- ============================================
-- SCORES
-- ============================================
create table public.scores (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references public.teams(id) on delete set null,
  team_name text not null,
  session text check (session in ('morning', 'afternoon')),
  total_score int not null,
  individual_scores jsonb not null default '[]'::jsonb,
  source text not null default 'manual' check (source in ('csv', 'manual')),
  year int not null default extract(year from now()),
  created_at timestamptz not null default now()
);

alter table public.scores enable row level security;

create policy "Scores are viewable by everyone"
  on public.scores for select using (true);

create policy "Admins can manage scores"
  on public.scores for all using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- CONTACTS
-- ============================================
create table public.contacts (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  email text not null,
  phone text,
  type text not null default 'other' check (type in ('player', 'sponsor', 'donor', 'other')),
  year_first_seen int not null default extract(year from now()),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.contacts enable row level security;

create policy "Admins can manage contacts"
  on public.contacts for all using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- EMAIL LOG
-- ============================================
create table public.email_log (
  id uuid primary key default uuid_generate_v4(),
  subject text not null,
  body text not null,
  recipient_count int not null default 0,
  sent_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz not null default now(),
  status text not null default 'sent' check (status in ('sent', 'failed'))
);

alter table public.email_log enable row level security;

create policy "Admins can manage email log"
  on public.email_log for all using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- STORAGE BUCKETS
-- ============================================
insert into storage.buckets (id, name, public)
values
  ('logos', 'logos', true),
  ('photos', 'photos', true),
  ('assets', 'assets', true);

-- Storage policies: anyone can read public buckets
create policy "Public read access for logos"
  on storage.objects for select using (bucket_id = 'logos');

create policy "Public read access for photos"
  on storage.objects for select using (bucket_id = 'photos');

create policy "Public read access for assets"
  on storage.objects for select using (bucket_id = 'assets');

-- Anyone can upload to photos bucket (moderated)
create policy "Anyone can upload photos"
  on storage.objects for insert with check (bucket_id = 'photos');

-- Admins can upload to any bucket
create policy "Admins can upload to any bucket"
  on storage.objects for insert with check (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'admin'
    )
  );

-- Admins can delete from any bucket
create policy "Admins can delete from any bucket"
  on storage.objects for delete using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- INDEXES
-- ============================================
create index idx_sponsors_tier_id on public.sponsors(tier_id);
create index idx_sponsors_year on public.sponsors(year);
create index idx_teams_year on public.teams(year);
create index idx_teams_session on public.teams(session);
create index idx_players_team_id on public.players(team_id);
create index idx_sponsorship_items_year on public.sponsorship_items(year);
create index idx_sponsorship_purchases_item_id on public.sponsorship_purchases(item_id);
create index idx_photos_status on public.photos(status);
create index idx_photos_year on public.photos(year);
create index idx_scores_year on public.scores(year);
create index idx_contacts_email on public.contacts(email);
create index idx_contacts_type on public.contacts(type);

-- ============================================
-- UPDATED_AT TRIGGER (for event_settings)
-- ============================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_event_settings_updated_at
  before update on public.event_settings
  for each row execute function public.set_updated_at();
