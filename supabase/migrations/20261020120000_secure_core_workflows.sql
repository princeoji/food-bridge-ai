-- Additive hardening for FoodHope. Existing records are preserved: NOT VALID
-- constraints check future writes without silently rewriting historical data.
begin;

alter table public.profiles
  add constraint profiles_organisation_name_valid
    check (char_length(btrim(organisation_name)) between 2 and 120) not valid,
  add constraint profiles_organisation_type_valid
    check (organisation_type in ('Hotel', 'NGO')) not valid,
  add constraint profiles_phone_valid
    check (
      char_length(btrim(phone)) between 6 and 40
      and phone ~ '^[0-9+()./[:space:]-]+$'
      and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 6
    ) not valid,
  add constraint profiles_capacity_valid
    check (capacity between 0 and 1000000) not valid,
  add constraint profiles_auth_user_fk
    foreign key (id) references auth.users(id) on delete cascade not valid;

alter table public.donations
  add constraint donations_food_name_valid
    check (char_length(btrim(food_name)) between 2 and 120) not valid,
  add constraint donations_quantity_valid
    check (quantity between 1 and 1000000) not valid,
  add constraint donations_pickup_address_valid
    check (char_length(btrim(pickup_address)) between 5 and 500) not valid,
  add constraint donations_notes_valid
    check (notes is null or char_length(notes) <= 2000) not valid,
  add constraint donations_status_valid
    check (status in ('available', 'claimed', 'delivered')) not valid,
  add constraint donations_claim_consistent
    check (
      (status = 'available' and claimed_by is null)
      or (status in ('claimed', 'delivered') and claimed_by is not null)
    ) not valid,
  add constraint donations_not_self_claimed
    check (claimed_by is null or claimed_by <> donor_id) not valid,
  add constraint donations_best_before_finite
    check (best_before is null or isfinite(best_before)) not valid,
  add constraint donations_donor_fk
    foreign key (donor_id) references public.profiles(id) on delete restrict not valid,
  add constraint donations_claimant_fk
    foreign key (claimed_by) references public.profiles(id) on delete restrict not valid;

create index if not exists donations_status_created_at_idx
  on public.donations(status, created_at desc);
create index if not exists donations_donor_created_at_idx
  on public.donations(donor_id, created_at desc);
create index if not exists donations_claimant_created_at_idx
  on public.donations(claimed_by, created_at desc) where claimed_by is not null;

-- Metadata is user input. Constraint failures reject malformed registrations;
-- no untrusted metadata can select an elevated role or overflow an integer.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_capacity text := coalesce(new.raw_user_meta_data->>'capacity', '0');
begin
  if v_capacity !~ '^[0-9]{1,7}$' then
    raise exception 'Capacity must be a whole number between 0 and 1000000.'
      using errcode = '22023';
  end if;
  if v_capacity::numeric > 1000000 then
    raise exception 'Capacity must be a whole number between 0 and 1000000.'
      using errcode = '22023';
  end if;

  insert into public.profiles
    (id, organisation_name, organisation_type, phone, capacity)
  values (
    new.id,
    btrim(coalesce(new.raw_user_meta_data->>'organisation_name', '')),
    coalesce(new.raw_user_meta_data->>'organisation_type', 'Hotel'),
    btrim(coalesce(new.raw_user_meta_data->>'phone', '')),
    v_capacity::integer
  );
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;

-- A client may repair its missing profile and edit contact/capacity fields.
-- Identity, registration time and organisation role are immutable to clients.
revoke insert, update, delete on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, organisation_name, organisation_type, phone, capacity)
  on public.profiles to authenticated;
grant update (organisation_name, phone, capacity)
  on public.profiles to authenticated;

drop policy if exists "own profile insert" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
create policy "own valid profile insert"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);
create policy "own profile contact update"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Organisation contact details are visible only to the account itself or an
-- actual collection partner. Available food uses a generic donor label until
-- a claim exists; browsing must not expose a global phone directory.
drop policy if exists "profiles readable by signed in" on public.profiles;
create policy "profiles readable by owner and collection partners"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.donations d
      where d.status in ('claimed', 'delivered') and (
        (d.donor_id = profiles.id and d.claimed_by = auth.uid())
        or (d.claimed_by = profiles.id and d.donor_id = auth.uid())
      )
    )
  );

-- Role checks and initial state belong in the database, not only in the UI.
-- No authenticated caller can directly UPDATE donation details or ownership.
revoke insert, update, delete on public.donations from public, anon, authenticated;
grant select on public.donations to authenticated;
grant insert (donor_id, food_name, quantity, pickup_address, best_before, notes)
  on public.donations to authenticated;
grant delete on public.donations to authenticated;

-- This policy deliberately does not consult profiles: the related-profile
-- policy above consults visible donations, and reciprocal lookups would recurse.
drop policy if exists "donations readable" on public.donations;
create policy "donations readable by participants or while available"
  on public.donations for select to authenticated
  using (
    donor_id = auth.uid()
    or claimed_by = auth.uid()
    or (
      status = 'available'
      and claimed_by is null
      and best_before > statement_timestamp()
      and isfinite(best_before)
    )
  );

drop policy if exists "donor inserts" on public.donations;
drop policy if exists "donor updates own" on public.donations;
drop policy if exists "ngo claims available" on public.donations;
drop policy if exists "donor deletes own" on public.donations;
create policy "hotels insert available donations"
  on public.donations for insert to authenticated
  with check (
    donor_id = auth.uid()
    and status = 'available'
    and claimed_by is null
    and best_before is not null
    and best_before > statement_timestamp()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.organisation_type = 'Hotel'
    )
  );
create policy "hotels delete own available donations"
  on public.donations for delete to authenticated
  using (
    donor_id = auth.uid()
    and status = 'available'
    and claimed_by is null
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.organisation_type = 'Hotel'
    )
  );

create or replace function public.claim_donation(p_donation_id uuid)
returns public.donations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_capacity integer;
  v_donation public.donations%rowtype;
begin
  if v_user_id is null then
    raise exception 'Sign in to claim food.' using errcode = '42501';
  end if;

  -- Keep the capacity used for this claim stable even if the donation lock
  -- waits while the same organisation edits its serving capacity elsewhere.
  select p.capacity into v_capacity from public.profiles p
    where p.id = v_user_id and p.organisation_type = 'NGO' for share;
  if not found then
    raise exception 'Only NGO accounts can claim food.' using errcode = '42501';
  end if;

  -- Competing claim/release/completion/deletion operations serialize here.
  -- The second claimant sees the first transaction's committed state.
  select * into v_donation from public.donations
    where id = p_donation_id for update;
  if not found then
    raise exception 'This donation no longer exists.' using errcode = 'P0002';
  end if;
  if v_donation.status <> 'available' or v_donation.claimed_by is not null then
    raise exception 'This donation is no longer available.' using errcode = '55000';
  end if;
  if v_donation.donor_id = v_user_id then
    raise exception 'You cannot claim your own donation.' using errcode = '42501';
  end if;
  if v_donation.best_before is null or v_donation.best_before <= clock_timestamp() then
    raise exception 'This donation has expired or has no best-before time.' using errcode = '22023';
  end if;
  if v_capacity < v_donation.quantity then
    raise exception 'Increase your serving capacity before claiming this quantity.' using errcode = '22023';
  end if;

  update public.donations set status = 'claimed', claimed_by = v_user_id
    where id = p_donation_id returning * into v_donation;
  return v_donation;
end;
$$;
revoke all on function public.claim_donation(uuid) from public, anon, authenticated, service_role;
grant execute on function public.claim_donation(uuid) to authenticated;

create or replace function public.release_donation(p_donation_id uuid)
returns public.donations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_donation public.donations%rowtype;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles p
    where p.id = v_user_id and p.organisation_type = 'NGO'
  ) then
    raise exception 'Only the NGO that claimed this food can release it.' using errcode = '42501';
  end if;

  select * into v_donation from public.donations
    where id = p_donation_id for update;
  if not found then
    raise exception 'This donation no longer exists.' using errcode = 'P0002';
  end if;
  if v_donation.claimed_by is distinct from v_user_id then
    raise exception 'Only the NGO that claimed this food can release it.' using errcode = '42501';
  end if;
  if v_donation.status <> 'claimed' then
    raise exception 'Only an active claim can be released.' using errcode = '55000';
  end if;

  -- Expired claims can be released too. Their original expiry is preserved,
  -- so claim_donation will still reject them and the UI can hide them.
  update public.donations set status = 'available', claimed_by = null
    where id = p_donation_id returning * into v_donation;
  return v_donation;
end;
$$;
revoke all on function public.release_donation(uuid) from public, anon, authenticated, service_role;
grant execute on function public.release_donation(uuid) to authenticated;

create or replace function public.complete_donation(p_donation_id uuid)
returns public.donations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_donation public.donations%rowtype;
begin
  if v_user_id is null then
    raise exception 'Sign in to confirm collection.' using errcode = '42501';
  end if;

  select * into v_donation from public.donations
    where id = p_donation_id for update;
  if not found then
    raise exception 'This donation no longer exists.' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.profiles p where p.id = v_user_id and (
      (p.organisation_type = 'Hotel' and v_donation.donor_id = v_user_id)
      or (p.organisation_type = 'NGO' and v_donation.claimed_by = v_user_id)
    )
  ) then
    raise exception 'Only this donor or its claiming NGO can confirm collection.' using errcode = '42501';
  end if;
  -- Authorized retries are safe; neither participant can finish unclaimed food.
  if v_donation.status = 'delivered' then
    return v_donation;
  end if;
  if v_donation.status <> 'claimed' or v_donation.claimed_by is null then
    raise exception 'Claim the donation before confirming collection.' using errcode = '55000';
  end if;

  -- A confirmation may be recorded after pickup; expiry is checked at claim.
  update public.donations set status = 'delivered'
    where id = p_donation_id returning * into v_donation;
  return v_donation;
end;
$$;
revoke all on function public.complete_donation(uuid) from public, anon, authenticated, service_role;
grant execute on function public.complete_donation(uuid) to authenticated;

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  message text not null check (char_length(btrim(message)) between 10 and 5000),
  submitted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index contact_messages_email_created_at_idx
  on public.contact_messages(email, created_at desc);
alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from public, anon, authenticated;
grant all on public.contact_messages to service_role;

create or replace function public.submit_contact_message(p_name text, p_email text, p_message text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_message text := btrim(coalesce(p_message, ''));
begin
  if char_length(v_name) not between 2 and 120 then
    raise exception 'Name must contain between 2 and 120 characters.' using errcode = '22023';
  end if;
  if char_length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;
  if char_length(v_message) not between 10 and 5000 then
    raise exception 'Message must contain between 10 and 5000 characters.' using errcode = '22023';
  end if;

  -- Serialize each normalized email, so concurrent submissions cannot bypass
  -- these address-based limits. This is not an IP limit or identity proof.
  perform pg_advisory_xact_lock(hashtextextended('foodhope.contact:' || v_email, 0));
  if exists (
    select 1 from public.contact_messages
    where email = v_email and created_at > clock_timestamp() - interval '1 minute'
  ) then
    raise exception 'Please wait a minute before sending another message.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.contact_messages
      where email = v_email and created_at > clock_timestamp() - interval '1 hour') >= 3 then
    raise exception 'Message limit reached. Please try again in an hour.' using errcode = 'P0001';
  end if;

  insert into public.contact_messages(name, email, message, submitted_by, created_at)
    values (v_name, v_email, v_message, auth.uid(), clock_timestamp());
  return true;
end;
$$;
revoke all on function public.submit_contact_message(text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_contact_message(text, text, text)
  to anon, authenticated, service_role;

-- Collection confirmation is the auditable event counted as meals rescued.
-- Claims alone no longer increase the public meal counter.
create or replace function public.impact_stats()
returns json
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select json_build_object(
    'meals', coalesce((select sum(quantity) from public.donations where status = 'delivered'), 0),
    'hotels', (select count(*) from public.profiles where organisation_type = 'Hotel'),
    'ngos', (select count(*) from public.profiles where organisation_type = 'NGO'),
    'donations', (select count(*) from public.donations)
  );
$$;
revoke all on function public.impact_stats() from public, anon, authenticated, service_role;
grant execute on function public.impact_stats() to anon, authenticated, service_role;

-- Make the new RPCs visible to PostgREST as soon as the transaction commits.
notify pgrst, 'reload schema';
commit;
