begin;

alter table public.rentals add column is_sample boolean not null default false;
create unique index rentals_one_sample_per_user on public.rentals (user_id) where is_sample;

-- All fixture rows commit together. SECURITY INVOKER keeps the caller's RLS
-- protections; no service-role credentials or elevated insert privileges.
create function public.seed_sample_apartment(
  p_rental jsonb, p_items jsonb, p_events jsonb, p_deductions jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  owner_id uuid := auth.uid();
  existing_id uuid;
  rental_id uuid := (p_rental->>'id')::uuid;
begin
  if owner_id is null then
    raise exception 'A guest session is required';
  end if;

  -- Concurrent clicks in different tabs reopen the same sample.
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 0));
  select id into existing_id from public.rentals
    where user_id = owner_id and is_sample limit 1;
  if existing_id is not null then return existing_id; end if;

  insert into public.rentals (
    id, address, state, landlord_name, landlord_email, monthly_rent,
    deposit_amount, lease_start, lease_end, move_out_date, is_sample
  ) values (
    rental_id, p_rental->>'address', p_rental->>'state',
    p_rental->>'landlord_name', p_rental->>'landlord_email',
    (p_rental->>'monthly_rent')::numeric, (p_rental->>'deposit_amount')::numeric,
    (p_rental->>'lease_start')::date, (p_rental->>'lease_end')::date,
    (p_rental->>'move_out_date')::date, true
  );

  insert into public.inspection_items (
    id, rental_id, room, item, phase, condition, note, photo_path, captured_at
  ) select entry.id, rental_id, entry.room, entry.item, entry.phase, entry.condition,
    entry.note, entry.photo_path, entry.captured_at
    from jsonb_to_recordset(p_items) as entry (
      id uuid, room text, item text, phase text, condition text, note text,
      photo_path text, captured_at timestamptz
    );

  insert into public.lease_events (
    id, rental_id, kind, title, details, due_date, resolved, created_at
  ) select entry.id, rental_id, entry.kind, entry.title, entry.details,
    entry.due_date, entry.resolved, entry.created_at
    from jsonb_to_recordset(p_events) as entry (
      id uuid, kind text, title text, details text, due_date date,
      resolved boolean, created_at timestamptz
    );

  insert into public.deductions (id, rental_id, description, amount, disputed)
    select entry.id, rental_id, entry.description, entry.amount, entry.disputed
    from jsonb_to_recordset(p_deductions) as entry (
      id uuid, description text, amount numeric, disputed boolean
    );
  return rental_id;
end;
$$;

revoke all on function public.seed_sample_apartment(jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.seed_sample_apartment(jsonb, jsonb, jsonb, jsonb) to authenticated;

commit;
