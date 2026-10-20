-- Run after all migrations, as the database owner. No pgTAP dependency.
-- Every fixture and temporary helper is rolled back at the end.
begin;

create function pg_temp.assert_true(p_condition boolean, p_label text)
returns void language plpgsql as $$
begin
  if p_condition is distinct from true then
    raise exception 'Assertion failed: %', p_label;
  end if;
end;
$$;

create function pg_temp.assert_error(p_sql text, p_expected_state text, p_label text)
returns void language plpgsql as $$
declare
  v_state text;
  v_caught boolean := false;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate;
    if v_state <> p_expected_state then
      raise exception 'Assertion failed: %; expected SQLSTATE %, received % (%)',
        p_label, p_expected_state, v_state, sqlerrm;
    end if;
    v_caught := true;
  end;
  if not v_caught then
    raise exception 'Assertion failed: %; expected SQLSTATE %, statement succeeded',
      p_label, p_expected_state;
  end if;
end;
$$;

insert into auth.users(id, email, raw_user_meta_data) values
  ('10000000-0000-4000-8000-000000000001', 'hotel-one@foodhope.test',
   '{"organisation_name":"Test Hotel One","organisation_type":"Hotel","phone":"+91 9000000001","capacity":500}'),
  ('10000000-0000-4000-8000-000000000002', 'hotel-two@foodhope.test',
   '{"organisation_name":"Test Hotel Two","organisation_type":"Hotel","phone":"+91 9000000002","capacity":500}'),
  ('20000000-0000-4000-8000-000000000001', 'ngo-one@foodhope.test',
   '{"organisation_name":"Test NGO One","organisation_type":"NGO","phone":"+91 9000000003","capacity":200}'),
  ('20000000-0000-4000-8000-000000000002', 'ngo-two@foodhope.test',
   '{"organisation_name":"Test NGO Two","organisation_type":"NGO","phone":"+91 9000000004","capacity":200}'),
  ('20000000-0000-4000-8000-000000000003', 'ngo-small@foodhope.test',
   '{"organisation_name":"Small NGO","organisation_type":"NGO","phone":"+91 9000000005","capacity":5}'),
  ('20000000-0000-4000-8000-000000000004', 'ngo-zero@foodhope.test',
   '{"organisation_name":"New NGO","organisation_type":"NGO","phone":"+91 9000000006","capacity":0}'),
  ('20000000-0000-4000-8000-000000000005', 'ngo-repair@foodhope.test',
   '{"organisation_name":"Repairable NGO","organisation_type":"NGO","phone":"+91 9000000007","capacity":10}');

-- Simulate a historical account whose signup profile was never populated.
delete from public.profiles where id='20000000-0000-4000-8000-000000000005';

insert into public.donations
  (id, donor_id, food_name, quantity, pickup_address, best_before)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
   'Vegetable rice', 20, 'Test hotel reception', now() + interval '1 day'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
   'Bread and fruit', 10, 'Test hotel reception', now() + interval '1 day'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001',
   'Expired legacy food', 10, 'Test hotel reception', now() - interval '1 hour'),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001',
   'Undated legacy food', 10, 'Test hotel reception', null),
  ('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001',
   'Large donation', 201, 'Test hotel reception', now() + interval '1 day'),
  ('30000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001',
   'Donor-confirmed meal', 15, 'Test hotel reception', now() + interval '1 day'),
  ('30000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001',
   'Expires after claiming', 10, 'Test hotel reception', now() + interval '1 day');

-- Anonymous users get aggregate statistics, never underlying private tables.
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.assert_true((public.impact_stats()->>'meals')::integer = 0, 'unclaimed meals are not counted');
select pg_temp.assert_error('select * from public.profiles', '42501', 'anonymous profiles are private');
select pg_temp.assert_error('select * from public.donations', '42501', 'anonymous donations are private');
select pg_temp.assert_error('select * from public.contact_messages', '42501', 'contact inbox is private');
select pg_temp.assert_error(
  $$select public.claim_donation('30000000-0000-4000-8000-000000000001')$$,
  '42501', 'anonymous claims forbidden');
select pg_temp.assert_true(public.submit_contact_message('Test Sender', ' TEST@foodhope.test ', 'I would like to partner with FoodHope.'), 'contact message saved');
select pg_temp.assert_error(
  $$select public.submit_contact_message('Test Sender', 'test@foodhope.test', 'A repeated message within the cooldown.')$$,
  'P0001', 'normalized sender cooldown enforced');
select pg_temp.assert_error(
  $$select public.submit_contact_message('A', 'bad-email', 'short')$$,
  '22023', 'malformed contact input rejected');
select pg_temp.assert_error(
  $$insert into public.contact_messages(name,email,message) values ('Bad caller','bad@foodhope.test','Cannot write directly.')$$,
  '42501', 'anonymous direct contact writes forbidden');

-- Hotels can create valid available listings, but cannot spoof lifecycle state.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
insert into public.donations(donor_id, food_name, quantity, pickup_address, best_before)
values ('10000000-0000-4000-8000-000000000001', 'Fresh donor listing', 8,
        'Test hotel reception', now() + interval '2 hours');
select pg_temp.assert_true(exists(select 1 from public.donations where food_name = 'Fresh donor listing'), 'hotel can list food');
select pg_temp.assert_error(
  $$insert into public.donations(donor_id,food_name,quantity,pickup_address,best_before,status,claimed_by) values ('10000000-0000-4000-8000-000000000001','Fake delivery',10,'Test hotel reception',now()+interval '1 day','delivered','20000000-0000-4000-8000-000000000001')$$,
  '42501', 'caller cannot insert claimed/delivered state');
select pg_temp.assert_error(
  $$insert into public.donations(donor_id,food_name,quantity,pickup_address,best_before) values ('10000000-0000-4000-8000-000000000002','Spoofed donor',10,'Test hotel reception',now()+interval '1 day')$$,
  '42501', 'donor identity cannot be spoofed');
select pg_temp.assert_error(
  $$insert into public.donations(donor_id,food_name,quantity,pickup_address,best_before) values ('10000000-0000-4000-8000-000000000001','Zero meals',0,'Test hotel reception',now()+interval '1 day')$$,
  '23514', 'quantity must be positive');
select pg_temp.assert_error(
  $$insert into public.donations(donor_id,food_name,quantity,pickup_address,best_before) values ('10000000-0000-4000-8000-000000000001','Expired listing',10,'Test hotel reception',now()-interval '1 hour')$$,
  '42501', 'cannot list already expired food');
select pg_temp.assert_error(
  $$insert into public.donations(donor_id,food_name,quantity,pickup_address) values ('10000000-0000-4000-8000-000000000001','Undated listing',10,'Test hotel reception')$$,
  '42501', 'new listings need best-before time');
select pg_temp.assert_error(
  $$update public.donations set quantity = 999 where id='30000000-0000-4000-8000-000000000001'$$,
  '42501', 'direct donation mutation forbidden even to donor');
select pg_temp.assert_error(
  $$select public.claim_donation('30000000-0000-4000-8000-000000000001')$$,
  '42501', 'hotel cannot claim food');
select pg_temp.assert_error(
  $$select public.complete_donation('30000000-0000-4000-8000-000000000001')$$,
  '55000', 'donor cannot complete available food');
select pg_temp.assert_error(
  $$update public.profiles set organisation_type='NGO' where id='10000000-0000-4000-8000-000000000001'$$,
  '42501', 'client organisation role immutable');
update public.profiles set organisation_name = 'Updated Hotel', phone = '+91 (900) 000-0001', capacity = 600
where id = '10000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select capacity = 600 from public.profiles where id='10000000-0000-4000-8000-000000000001'), 'owner can update contact and capacity');
select pg_temp.assert_error(
  $$update public.profiles set capacity=-1 where id='10000000-0000-4000-8000-000000000001'$$,
  '23514', 'negative profile capacity rejected');
select pg_temp.assert_error(
  $$update public.profiles set phone='abc123' where id='10000000-0000-4000-8000-000000000001'$$,
  '23514', 'malformed phone rejected');
update public.profiles set organisation_name = 'Hijacked NGO'
where id = '20000000-0000-4000-8000-000000000001';
select pg_temp.assert_true(not exists(select 1 from public.profiles where id='20000000-0000-4000-8000-000000000001'), 'unrelated organisation contacts hidden');
reset role;
select pg_temp.assert_true((select organisation_name = 'Test NGO One' from public.profiles where id='20000000-0000-4000-8000-000000000001'), 'another organisation profile cannot be edited');
set local role authenticated;

-- An account can recover its own missing profile, without creating others.
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000005', true);
insert into public.profiles(id,organisation_name,organisation_type,phone,capacity)
values ('20000000-0000-4000-8000-000000000005','Repaired NGO','NGO','+91 9000000007',10);
select pg_temp.assert_true((select organisation_name='Repaired NGO' from public.profiles where id='20000000-0000-4000-8000-000000000005'), 'missing own profile can be repaired');
select pg_temp.assert_error(
  $$insert into public.profiles(id,organisation_name,organisation_type,phone,capacity) values ('29999999-0000-4000-8000-000000000099','Other profile','NGO','+91 9000000008',10)$$,
  '42501', 'cannot create another user profile');

-- Capacity is an individual listing limit, including an explicit zero case.
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000003', true);
select pg_temp.assert_error(
  $$select public.claim_donation('30000000-0000-4000-8000-000000000001')$$,
  '22023', 'small NGO cannot claim above its capacity');
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000004', true);
select pg_temp.assert_error(
  $$select public.claim_donation('30000000-0000-4000-8000-000000000001')$$,
  '22023', 'zero capacity cannot claim');

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true(not exists(select 1 from public.profiles where id='10000000-0000-4000-8000-000000000001'), 'available listing does not expose donor phone');
select pg_temp.assert_true(exists(select 1 from public.donations where id='30000000-0000-4000-8000-000000000001'), 'eligible unexpired listing visible before claim');
select pg_temp.assert_true(not exists(select 1 from public.donations where id in ('30000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000004')), 'expired and undated food hidden from unrelated browsers');
select pg_temp.assert_error(
  $$insert into public.donations(donor_id,food_name,quantity,pickup_address,best_before) values ('20000000-0000-4000-8000-000000000001','NGO listing',10,'Test NGO reception',now()+interval '1 day')$$,
  '42501', 'NGOs cannot list donor food');
select pg_temp.assert_error(
  $$select public.claim_donation('30000000-0000-4000-8000-000000000003')$$,
  '22023', 'expired legacy food cannot be claimed');
select pg_temp.assert_error(
  $$select public.claim_donation('30000000-0000-4000-8000-000000000004')$$,
  '22023', 'undated legacy food cannot be claimed');
select pg_temp.assert_error(
  $$select public.claim_donation('39999999-0000-4000-8000-000000000099')$$,
  'P0002', 'missing donation fails clearly');
select pg_temp.assert_true((public.claim_donation('30000000-0000-4000-8000-000000000001')).status = 'claimed', 'eligible NGO can claim');
select pg_temp.assert_true((select phone='+91 (900) 000-0001' from public.profiles where id='10000000-0000-4000-8000-000000000001'), 'claimant can see donor contact after claim');
select pg_temp.assert_true((public.impact_stats()->>'meals')::integer = 0, 'claimed meals still not counted');
select pg_temp.assert_error(
  $$update public.donations set donor_id='20000000-0000-4000-8000-000000000001',quantity=999,status='delivered' where id='30000000-0000-4000-8000-000000000002'$$,
  '42501', 'original ownership-changing claim exploit blocked');

-- Another NGO cannot steal, release, or complete somebody else's claim.
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select pg_temp.assert_true(not exists(select 1 from public.donations where id='30000000-0000-4000-8000-000000000001'), 'unrelated NGO cannot read claimed food history');
select pg_temp.assert_true(not exists(select 1 from public.profiles where id='10000000-0000-4000-8000-000000000001'), 'unrelated NGO cannot read claimed donor contact');
select pg_temp.assert_error(
  $$select public.claim_donation('30000000-0000-4000-8000-000000000001')$$,
  '55000', 'second claim loses without overwriting the first');
select pg_temp.assert_error(
  $$select public.release_donation('30000000-0000-4000-8000-000000000001')$$,
  '42501', 'another NGO cannot release claim');
select pg_temp.assert_error(
  $$select public.complete_donation('30000000-0000-4000-8000-000000000001')$$,
  '42501', 'another NGO cannot complete claim');
reset role;
select pg_temp.assert_true((select claimed_by='20000000-0000-4000-8000-000000000001' and donor_id='10000000-0000-4000-8000-000000000001' and quantity=20 from public.donations where id='30000000-0000-4000-8000-000000000001'), 'rejected actions preserve claimant, donor and quantity');
set local role authenticated;

-- Only the claimant can release, after which another eligible NGO may claim.
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true((public.release_donation('30000000-0000-4000-8000-000000000001')).status = 'available', 'claimant can release');
select pg_temp.assert_true((select claimed_by is null from public.donations where id='30000000-0000-4000-8000-000000000001'), 'release clears claimant');
select pg_temp.assert_true(not exists(select 1 from public.profiles where id='10000000-0000-4000-8000-000000000001'), 'released claimant loses donor contact access');
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select public.claim_donation('30000000-0000-4000-8000-000000000001');
select pg_temp.assert_true(exists(select 1 from public.profiles where id='10000000-0000-4000-8000-000000000001'), 'new claimant gains donor contact access');

-- Donors cannot delete a claim, and unrelated hotels cannot confirm it.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true((select phone='+91 9000000004' from public.profiles where id='20000000-0000-4000-8000-000000000002'), 'donor can see claiming NGO contact');
delete from public.donations where id='30000000-0000-4000-8000-000000000001';
select pg_temp.assert_true(exists(select 1 from public.donations where id='30000000-0000-4000-8000-000000000001'), 'claimed donation cannot be deleted');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select pg_temp.assert_error(
  $$select public.complete_donation('30000000-0000-4000-8000-000000000001')$$,
  '42501', 'unrelated hotel cannot complete claim');

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select pg_temp.assert_true((public.complete_donation('30000000-0000-4000-8000-000000000001')).status = 'delivered', 'claimant can confirm collection');
select pg_temp.assert_true((public.complete_donation('30000000-0000-4000-8000-000000000001')).status = 'delivered', 'authorized completion retries are idempotent');
select pg_temp.assert_true(exists(select 1 from public.profiles where id='10000000-0000-4000-8000-000000000001'), 'delivered partners retain collection contact access');
select pg_temp.assert_error(
  $$select public.release_donation('30000000-0000-4000-8000-000000000001')$$,
  '55000', 'delivered food cannot be released');
select pg_temp.assert_true((public.impact_stats()->>'meals')::integer = 20, 'only delivered quantity counted once');
select public.claim_donation('30000000-0000-4000-8000-000000000006');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true((public.complete_donation('30000000-0000-4000-8000-000000000006')).status = 'delivered', 'owning hotel can also confirm collection');
delete from public.donations where id='30000000-0000-4000-8000-000000000002';
select pg_temp.assert_true(not exists(select 1 from public.donations where id='30000000-0000-4000-8000-000000000002'), 'donor can remove own available food');

-- A claim can be released after expiry, without resetting its safety deadline.
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select public.claim_donation('30000000-0000-4000-8000-000000000007');
reset role;
update public.donations set best_before=now()-interval '1 hour'
where id='30000000-0000-4000-8000-000000000007';
set local role authenticated;
select pg_temp.assert_true((public.release_donation('30000000-0000-4000-8000-000000000007')).status='available', 'expired claim can be released');
select pg_temp.assert_error(
  $$select public.claim_donation('30000000-0000-4000-8000-000000000007')$$,
  '22023', 'released expired food cannot be reclaimed');

-- Inspect the inbox as owner, never as a public caller.
reset role;
select pg_temp.assert_true((select count(*) = 1 from public.contact_messages where email='test@foodhope.test'), 'only one cooldown-protected message stored');
select pg_temp.assert_true((select submitted_by is null from public.contact_messages where email='test@foodhope.test'), 'anonymous contact message stores no invented user');
update public.contact_messages set created_at=now()-interval '2 minutes' where email='test@foodhope.test';
insert into public.contact_messages(name,email,message,created_at)
values ('Earlier Sender','test@foodhope.test','Previous message within the hourly limit.',now()-interval '3 minutes'),
       ('Earlier Sender','test@foodhope.test','Another message within the hourly limit.',now()-interval '4 minutes');
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.assert_error(
  $$select public.submit_contact_message('Test Sender','test@foodhope.test','A fourth message within the same hour.')$$,
  'P0001', 'hourly contact limit enforced');
select pg_temp.assert_true((public.impact_stats()->>'meals')::integer = 35, 'public aggregate reflects collected meals');

reset role;
rollback;
