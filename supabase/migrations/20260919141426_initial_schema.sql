-- AgriN initial Supabase schema
-- Firebase Firestore replacement

create type diagnosis_status as enum ('pending', 'success', 'failed');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  crop text not null,
  image_path text not null,
  location text,
  status diagnosis_status not null default 'pending',
  disease text,
  symptoms text,
  confidence text,
  advisory_text text,
  weather_context jsonb,
  translated_advisory text,
  sms_status jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index diagnoses_user_created_idx
  on diagnoses (user_id, created_at desc);

create table rate_limits (
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null,
  hits timestamptz[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, endpoint)
);

-- Automatically create a profile for every new anonymous/authenticated user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Enable Row Level Security.
alter table profiles enable row level security;
alter table diagnoses enable row level security;
alter table rate_limits enable row level security;

-- Profiles: users can only read/update their own profile.
create policy "Users can view own profile"
  on profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "Users can update own phone"
  on profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Diagnoses: users can only read their own diagnoses.
-- Writes are performed by Edge Functions, not directly by the browser.
create policy "Users can view own diagnoses"
  on diagnoses
  for select
  to authenticated
  using (user_id = auth.uid());

-- No client policies for rate_limits.
-- Rate limiting is handled server-side.

-- Private uploads bucket.
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

-- Storage: users can upload only into their own folder.
create policy "Users can upload own images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view own images"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );