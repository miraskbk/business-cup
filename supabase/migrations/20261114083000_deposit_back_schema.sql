-- Deposit Back schema: rentals, condition evidence, lease timeline, deductions,
-- and a private storage bucket for evidence photos.
--
-- Every table follows the same ownership pattern: user_id defaults to the
-- caller (auth.uid()) and a single RLS policy limits all operations to the
-- owner. Visitors use anonymous Supabase users, which have the `authenticated`
-- role, so the same policies cover guests and email accounts.

-- Rentals the user tracks
create table rentals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  address text not null,
  state text not null check (state ~ '^[A-Z]{2}$'),  -- 2-letter US state code
  landlord_name text,
  landlord_email text,
  monthly_rent numeric(10,2),
  deposit_amount numeric(10,2) not null,
  lease_start date,
  lease_end date,
  move_out_date date,                  -- set when the user moves out
  created_at timestamptz default now()
);

-- Condition evidence, per room, per phase
create table inspection_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  rental_id uuid not null references rentals on delete cascade,
  room text not null,                  -- 'Kitchen', 'Bathroom', ...
  item text not null,                  -- 'Countertop', 'Walls', ...
  phase text not null check (phase in ('move_in','move_out')),
  condition text not null check (condition in ('good','fair','damaged')),
  note text,
  photo_path text,                     -- Supabase Storage path
  captured_at timestamptz not null default now()  -- evidence timestamp, never editable in UI
);

-- Lease timeline: repair requests, landlord promises, payments, notices
create table lease_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  rental_id uuid not null references rentals on delete cascade,
  kind text not null check (kind in ('repair_request','landlord_promise','notice','payment','other')),
  title text not null,
  details text,
  due_date date,
  resolved boolean not null default false,
  created_at timestamptz default now()
);

-- Deductions the landlord claims at move-out
create table deductions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  rental_id uuid not null references rentals on delete cascade,
  description text not null,
  amount numeric(10,2) not null,
  disputed boolean not null default true,
  created_at timestamptz default now()
);

-- Child rows are always loaded per rental
create index inspection_items_rental_id_idx on inspection_items (rental_id);
create index lease_events_rental_id_idx on lease_events (rental_id);
create index deductions_rental_id_idx on deductions (rental_id);

alter table rentals enable row level security;
alter table inspection_items enable row level security;
alter table lease_events enable row level security;
alter table deductions enable row level security;

create policy "own rentals" on rentals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own items" on inspection_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own events" on lease_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own deductions" on deductions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Evidence photos: private bucket, images only, 10 MB per file.
-- Files live at {user_id}/{rental_id}/{item_id}.jpg and are shown with signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence', 'evidence', false, 10485760, array['image/*']);

-- Users can read and write only under their own {user_id}/ prefix.
create policy "own evidence select" on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own evidence insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own evidence update" on storage.objects for update to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own evidence delete" on storage.objects for delete to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
