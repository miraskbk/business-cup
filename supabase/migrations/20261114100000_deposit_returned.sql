begin;

alter table public.rentals add column deposit_returned_at date;
comment on column public.rentals.deposit_returned_at is
  'Date the renter confirmed the deposit was returned or the claim fully resolved.';

commit;
