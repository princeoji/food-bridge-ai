begin;

alter table public.profiles drop constraint profiles_organisation_type_valid;
alter table public.profiles add constraint profiles_organisation_type_valid
  check (organisation_type in ('Hotel','NGO','Volunteer')) not valid;

create schema if not exists foodbridge_private;
revoke all on schema foodbridge_private from public, anon, authenticated;
-- Six digits, globally unique, never recycled. Exhaustion fails without claiming.
-- This is an order reference; authorization always also checks account ownership.
create sequence foodbridge_private.pickup_codes minvalue 100000 maxvalue 999999 no cycle;

alter table public.donations
  add column pickup_code text unique check (pickup_code ~ '^[0-9]{6}$'),
  add column delivery_address text check (char_length(btrim(delivery_address)) between 5 and 500),
  add column volunteer_id uuid references public.profiles(id) on delete restrict,
  add column picked_up_at timestamptz,
  add column delivered_at timestamptz;
alter table public.donations drop constraint donations_status_valid;
alter table public.donations drop constraint donations_claim_consistent;
alter table public.donations add constraint donations_status_valid
  check (status in ('available','claimed','picked_up','delivered')) not valid;
alter table public.donations add constraint donations_claim_consistent
  check ((status = 'available' and claimed_by is null and volunteer_id is null
    and pickup_code is null and picked_up_at is null and delivered_at is null)
    or (status in ('claimed','picked_up','delivered') and claimed_by is not null)) not valid;
alter table public.donations add constraint donations_delivery_progress_valid
  check ((status <> 'picked_up' or (volunteer_id is not null and pickup_code is not null
    and picked_up_at is not null and delivered_at is null))
    and (picked_up_at is null or volunteer_id is not null)
    and (delivered_at is null or (status = 'delivered' and picked_up_at is not null))) not valid;
create index donations_volunteer_created_idx on public.donations(volunteer_id,created_at desc);
update public.donations set pickup_code = nextval('foodbridge_private.pickup_codes')::text
  where status = 'claimed';

-- Preserve the existing role/capacity/expiry/row-lock claim checks in a private helper.
alter function public.claim_donation(uuid) set schema foodbridge_private;
revoke all on function foodbridge_private.claim_donation(uuid) from public,anon,authenticated,service_role;
create function public.claim_donation(p_donation_id uuid, p_delivery_address text default null)
returns public.donations language plpgsql security definer set search_path = public,pg_temp as $$
declare d public.donations;
begin
  if auth.uid() is null then raise exception 'Sign in to claim food.' using errcode='42501'; end if;
  if p_delivery_address is null or char_length(btrim(p_delivery_address)) not between 5 and 500 then
    raise exception 'Enter the NGO delivery address (5–500 characters).' using errcode='22023'; end if;
  d := foodbridge_private.claim_donation(p_donation_id);
  update public.donations set pickup_code = nextval('foodbridge_private.pickup_codes')::text,
    delivery_address = btrim(p_delivery_address) where id=d.id returning * into d;
  return d;
end; $$;
revoke all on function public.claim_donation(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.claim_donation(uuid,text) to authenticated;

create or replace function public.release_donation(p_donation_id uuid)
returns public.donations language plpgsql security definer set search_path = public,pg_temp as $$
declare d public.donations;
begin
  select * into d from public.donations where id=p_donation_id for update;
  if auth.uid() is null or d.claimed_by is distinct from auth.uid() then
    raise exception 'Only the claiming NGO can release this food.' using errcode='42501'; end if;
  if d.status <> 'claimed' or d.volunteer_id is not null then
    raise exception 'Release is only possible before a volunteer accepts the delivery.' using errcode='55000'; end if;
  update public.donations set status='available',claimed_by=null,pickup_code=null,delivery_address=null
    where id=d.id returning * into d;
  return d;
end; $$;

create function public.set_delivery_address(p_donation_id uuid,p_address text)
returns public.donations language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.donations;
begin
  select * into d from public.donations where id=p_donation_id for update;
  if auth.uid() is null or d.claimed_by is distinct from auth.uid() then
    raise exception 'Only the claiming NGO can set the address.' using errcode='42501'; end if;
  if d.status <> 'claimed' or d.volunteer_id is not null then
    raise exception 'The address is fixed once a volunteer accepts.' using errcode='55000'; end if;
  if p_address is null or char_length(btrim(p_address)) not between 5 and 500 then
    raise exception 'Enter an address between 5 and 500 characters.' using errcode='22023'; end if;
  update public.donations set delivery_address=btrim(p_address) where id=d.id returning * into d;
  return d;
end; $$;

create function public.accept_delivery(p_donation_id uuid)
returns public.donations language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.donations;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid()
    and organisation_type='Volunteer') then
    raise exception 'Only volunteers can accept deliveries.' using errcode='42501'; end if;
  select * into d from public.donations where id=p_donation_id for update;
  if not found then raise exception 'Order no longer exists.' using errcode='P0002'; end if;
  if d.status <> 'claimed' or d.volunteer_id is not null then
    raise exception 'This order has already been accepted or is unavailable.' using errcode='55000'; end if;
  if d.delivery_address is null or d.pickup_code is null or d.best_before <= clock_timestamp()
    or d.best_before is null then
    raise exception 'This order is expired or missing delivery details.' using errcode='22023'; end if;
  update public.donations set volunteer_id=auth.uid() where id=d.id returning * into d;
  return d;
end; $$;

create function public.confirm_pickup(p_donation_id uuid,p_pickup_code text)
returns public.donations language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.donations;
begin
  select * into d from public.donations where id=p_donation_id for update;
  if auth.uid() is null or d.donor_id is distinct from auth.uid() then
    raise exception 'Only the donating hotel can confirm pickup.' using errcode='42501'; end if;
  if p_pickup_code is null or p_pickup_code !~ '^[0-9]{6}$' or p_pickup_code is distinct from d.pickup_code then
    raise exception 'The six-digit pickup code does not match this order.' using errcode='22023'; end if;
  if d.status <> 'claimed' or d.volunteer_id is null then
    raise exception 'A volunteer must accept this order before pickup.' using errcode='55000'; end if;
  if d.best_before is null or d.best_before <= clock_timestamp() then
    raise exception 'The food collection deadline has passed.' using errcode='22023'; end if;
  update public.donations set status='picked_up',picked_up_at=clock_timestamp() where id=d.id returning * into d;
  return d;
end; $$;

create or replace function public.complete_donation(p_donation_id uuid)
returns public.donations language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.donations;
begin
  select * into d from public.donations where id=p_donation_id for update;
  if auth.uid() is null or d.volunteer_id is distinct from auth.uid() then
    raise exception 'Only the assigned volunteer can confirm delivery.' using errcode='42501'; end if;
  if d.status='delivered' then return d; end if;
  if d.status <> 'picked_up' then
    raise exception 'The hotel must confirm pickup before delivery can be finished.' using errcode='55000'; end if;
  update public.donations set status='delivered',delivered_at=clock_timestamp() where id=d.id returning * into d;
  return d;
end; $$;

-- Unassigned volunteers receive only a safe order preview, never the pickup code
-- or contact phone numbers. Accepted orders are readable through ordinary RLS.
create function public.available_deliveries(p_offset integer default 0)
returns table(id uuid,food_name text,quantity integer,pickup_address text,delivery_address text,best_before timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where profiles.id=auth.uid()
    and organisation_type='Volunteer') then
    raise exception 'Sign in as a volunteer to browse deliveries.' using errcode='42501'; end if;
  return query select d.id,d.food_name,d.quantity,d.pickup_address,d.delivery_address,d.best_before
    from public.donations d where d.status='claimed' and d.volunteer_id is null
    and d.delivery_address is not null and d.pickup_code is not null and d.best_before>statement_timestamp()
    order by d.best_before,d.id limit 12 offset greatest(0,least(coalesce(p_offset,0),1000000));
end; $$;

drop policy "donations readable by participants or while available" on public.donations;
create policy "donations readable by participants or while available" on public.donations for select to authenticated
using (donor_id=auth.uid() or claimed_by=auth.uid() or volunteer_id=auth.uid()
  or (status='available' and claimed_by is null and best_before>statement_timestamp() and isfinite(best_before)));
drop policy "profiles readable by owner and collection partners" on public.profiles;
create policy "profiles readable by owner and collection partners" on public.profiles for select to authenticated
using (id=auth.uid() or exists(select 1 from public.donations d
  where d.status in ('claimed','picked_up','delivered')
  and auth.uid() in (d.donor_id,d.claimed_by,d.volunteer_id)
  and profiles.id in (d.donor_id,d.claimed_by,d.volunteer_id)));

revoke all on function public.accept_delivery(uuid),public.confirm_pickup(uuid,text),
  public.set_delivery_address(uuid,text),public.available_deliveries(integer),
  public.release_donation(uuid),public.complete_donation(uuid) from public,anon,authenticated,service_role;
grant execute on function public.accept_delivery(uuid),public.confirm_pickup(uuid,text),
  public.set_delivery_address(uuid,text),public.available_deliveries(integer),
  public.release_donation(uuid),public.complete_donation(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
