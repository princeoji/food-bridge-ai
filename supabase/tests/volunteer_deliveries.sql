begin;
select set_config('foodbridge_test.baseline_meals',public.impact_stats()->>'meals',true);
-- Core suite's temporary assertion helpers survive its fixture rollback only
-- when explicitly re-created here.
create or replace function pg_temp.assert_true(p_condition boolean,p_label text)
returns void language plpgsql as $$ begin if p_condition is distinct from true then
 raise exception 'Assertion failed: %',p_label; end if; end; $$;
create or replace function pg_temp.assert_error(p_sql text,p_expected_state text,p_label text)
returns void language plpgsql as $$ declare caught boolean:=false; actual text; begin
 begin execute p_sql; exception when others then get stacked diagnostics actual=returned_sqlstate;
 if actual<>p_expected_state then raise exception 'Assertion failed: %; expected %, got % (%)',p_label,p_expected_state,actual,sqlerrm; end if;
 caught:=true; end; if not caught then raise exception 'Assertion failed: %; statement succeeded',p_label; end if; end; $$;
insert into auth.users(id,raw_user_meta_data) values
('10000000-0000-4000-8000-000000000001','{"organisation_name":"Hotel","organisation_type":"Hotel","phone":"123456","capacity":500}'),
('20000000-0000-4000-8000-000000000001','{"organisation_name":"NGO One","organisation_type":"NGO","phone":"123456","capacity":500}'),
('40000000-0000-4000-8000-000000000001','{"organisation_name":"Volunteer One","organisation_type":"Volunteer","phone":"123456","capacity":0}'),
('40000000-0000-4000-8000-000000000002','{"organisation_name":"Volunteer Two","organisation_type":"Volunteer","phone":"123456","capacity":0}');
insert into public.donations(id,donor_id,food_name,quantity,pickup_address,best_before) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Test rice',10,'Hotel reception',now()+interval '1 day'),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Test bread',10,'Hotel reception',now()+interval '1 day');
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_error($q$select public.claim_donation('30000000-0000-4000-8000-000000000001')$q$,'22023','delivery address required');
select public.claim_donation('30000000-0000-4000-8000-000000000001','NGO reception, Main Road');
select public.claim_donation('30000000-0000-4000-8000-000000000002','NGO reception, Main Road');
select pg_temp.assert_true((select bool_and(pickup_code ~ '^[0-9]{6}$') and count(distinct pickup_code)=2 from public.donations where id in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002')),'six digit codes are unique');
select pg_temp.assert_error($q$select public.complete_donation('30000000-0000-4000-8000-000000000001')$q$,'42501','NGO cannot finish volunteer delivery');
select pg_temp.assert_error($q$select public.accept_delivery('30000000-0000-4000-8000-000000000001')$q$,'42501','NGO cannot accept volunteer task');
select set_config('foodbridge_test.previous_code',(select pickup_code from public.donations where id='30000000-0000-4000-8000-000000000002'),true);
select public.release_donation('30000000-0000-4000-8000-000000000002');
select pg_temp.assert_true((select pickup_code is null from public.donations where id='30000000-0000-4000-8000-000000000002'),'release clears code');
select public.claim_donation('30000000-0000-4000-8000-000000000002','NGO reception, Main Road');
select pg_temp.assert_true((select pickup_code <> current_setting('foodbridge_test.previous_code') from public.donations where id='30000000-0000-4000-8000-000000000002'),'reclaim generates fresh code');
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true((select count(*)=2 from public.available_deliveries() where id in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002')),'volunteer sees waiting tasks');
select pg_temp.assert_true((select count(*)=0 from public.donations where status='claimed'),'unassigned volunteer cannot read pickup codes');
select pg_temp.assert_true((select count(*)=0 from public.profiles where id='10000000-0000-4000-8000-000000000001'),'unassigned volunteer cannot read contacts');
select public.accept_delivery('30000000-0000-4000-8000-000000000001');
select pg_temp.assert_true((select count(*)=1 from public.available_deliveries() where id in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002')),'accepted task leaves queue');
select pg_temp.assert_true((select pickup_code ~ '^[0-9]{6}$' from public.donations where id='30000000-0000-4000-8000-000000000001'),'assigned volunteer sees code');
select pg_temp.assert_true((select count(*)=2 from public.profiles where id in ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001')),'assigned volunteer sees both partners');
select pg_temp.assert_error($q$select public.complete_donation('30000000-0000-4000-8000-000000000001')$q$,'55000','cannot deliver before hotel pickup');
select pg_temp.assert_error($q$select public.confirm_pickup('30000000-0000-4000-8000-000000000001','100000')$q$,'42501','volunteer cannot confirm hotel pickup');
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_error($q$select public.accept_delivery('30000000-0000-4000-8000-000000000001')$q$,'55000','second volunteer cannot steal order');
select pg_temp.assert_error($q$select public.complete_donation('30000000-0000-4000-8000-000000000001')$q$,'42501','unassigned volunteer cannot finish order');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_error($q$select public.release_donation('30000000-0000-4000-8000-000000000001')$q$,'55000','cannot release accepted task');
select pg_temp.assert_error($q$select public.set_delivery_address('30000000-0000-4000-8000-000000000001','Changed location')$q$,'55000','accepted destination immutable');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_error($q$select public.confirm_pickup('30000000-0000-4000-8000-000000000001','000000')$q$,'22023','wrong code rejected');
select public.confirm_pickup('30000000-0000-4000-8000-000000000001',(select pickup_code from public.donations where id='30000000-0000-4000-8000-000000000001'));
select pg_temp.assert_true((select status='picked_up' and picked_up_at is not null from public.donations where id='30000000-0000-4000-8000-000000000001'),'hotel confirms timestamped pickup');
select pg_temp.assert_error($q$select public.complete_donation('30000000-0000-4000-8000-000000000001')$q$,'42501','hotel cannot finish delivery');
select pg_temp.assert_true((public.impact_stats()->>'meals')::bigint=current_setting('foodbridge_test.baseline_meals')::bigint,'pickup does not count as delivered impact');
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select public.complete_donation('30000000-0000-4000-8000-000000000001');
select pg_temp.assert_true((select status='delivered' and delivered_at is not null from public.donations where id='30000000-0000-4000-8000-000000000001'),'assigned volunteer completes delivery');
select public.complete_donation('30000000-0000-4000-8000-000000000001');
select pg_temp.assert_true((public.impact_stats()->>'meals')::bigint=current_setting('foodbridge_test.baseline_meals')::bigint+10,'delivery counted once');
select pg_temp.assert_error($q$update public.donations set volunteer_id='40000000-0000-4000-8000-000000000002'$q$,'42501','direct reassignment forbidden');
select pg_temp.assert_error($q$select foodbridge_private.claim_donation('30000000-0000-4000-8000-000000000002')$q$,'42501','private helper inaccessible');
set local role anon;
select pg_temp.assert_error($q$select public.available_deliveries()$q$,'42501','anonymous task queue forbidden');
rollback;
