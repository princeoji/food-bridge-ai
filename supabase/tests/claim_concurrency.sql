-- TWO-CONNECTION POSTGRESQL TEST: use a disposable migrated test database.
-- This file is a recipe with separately labeled blocks, not one batch to run.
-- A single-connection engine such as PGlite cannot exercise lock contention.

-- 1. SETUP CONNECTION (database owner): run and commit the fixture.
begin;
insert into auth.users(id, email, raw_user_meta_data) values
  ('40000000-0000-4000-8000-000000000001', 'concurrent-hotel@foodhope.test',
   '{"organisation_name":"Concurrent Hotel","organisation_type":"Hotel","phone":"+91 9111111111","capacity":200}'),
  ('40000000-0000-4000-8000-000000000002', 'concurrent-ngo-one@foodhope.test',
   '{"organisation_name":"Concurrent NGO One","organisation_type":"NGO","phone":"+91 9222222222","capacity":200}'),
  ('40000000-0000-4000-8000-000000000003', 'concurrent-ngo-two@foodhope.test',
   '{"organisation_name":"Concurrent NGO Two","organisation_type":"NGO","phone":"+91 9333333333","capacity":200}');
insert into public.donations(id, donor_id, food_name, quantity, pickup_address, best_before)
values ('40000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000001',
        'Concurrency test rice', 20, 'Disposable test address', now() + interval '1 day');
commit;

-- 2. CONNECTION A: claim successfully; leave this transaction OPEN.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000002', true);
select public.claim_donation('40000000-0000-4000-8000-000000000004','Disposable NGO address');

-- 3. CONNECTION B: start while A remains open. The final SELECT must BLOCK.
begin;
set local lock_timeout = '15s';
set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000003', true);
select public.claim_donation('40000000-0000-4000-8000-000000000004','Disposable NGO address');

-- 4. CONNECTION A: commit within B's 15-second lock timeout.
commit;

-- 5. CONNECTION B: the blocked SELECT now fails with SQLSTATE 55000,
--    "This donation is no longer available." Then roll back B.
rollback;

-- 6. SETUP CONNECTION: verify one winner and unchanged donor/quantity.
do $$
begin
  if not exists (
    select 1 from public.donations
    where id = '40000000-0000-4000-8000-000000000004'
      and status = 'claimed'
      and claimed_by = '40000000-0000-4000-8000-000000000002'
      and donor_id = '40000000-0000-4000-8000-000000000001'
      and quantity = 20
  ) then
    raise exception 'Concurrent claim invariant failed';
  end if;
end;
$$;

-- 7. SETUP CONNECTION: clean up only the explicitly listed test records.
begin;
delete from public.donations where id = '40000000-0000-4000-8000-000000000004';
delete from auth.users where id in (
  '40000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000002',
  '40000000-0000-4000-8000-000000000003'
);
commit;

-- Rollback variant: repeat the fixture/test, but ROLLBACK A in step 4.
-- B must then succeed and become the sole claimant, preserving donor/quantity.
-- Verify with claimant ...0003, commit B, and run the same bounded cleanup.
