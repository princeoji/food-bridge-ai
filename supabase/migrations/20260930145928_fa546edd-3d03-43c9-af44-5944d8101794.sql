create table public.profiles (
  id uuid primary key,
  organisation_name text not null default '',
  organisation_type text not null default 'Hotel',
  phone text not null default '',
  capacity integer not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by signed in" on public.profiles for select to authenticated using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, organisation_name, organisation_type, phone, capacity)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'organisation_name',''),
    coalesce(new.raw_user_meta_data->>'organisation_type','Hotel'),
    coalesce(new.raw_user_meta_data->>'phone',''),
    coalesce((new.raw_user_meta_data->>'capacity')::int,0));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null,
  food_name text not null,
  quantity integer not null,
  pickup_address text not null,
  best_before timestamptz,
  notes text,
  status text not null default 'available',
  claimed_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.donations to authenticated;
grant all on public.donations to service_role;
alter table public.donations enable row level security;
create policy "donations readable" on public.donations for select to authenticated using (true);
create policy "donor inserts" on public.donations for insert to authenticated with check (auth.uid() = donor_id);
create policy "donor updates own" on public.donations for update to authenticated using (auth.uid() = donor_id);
create policy "ngo claims available" on public.donations for update to authenticated using (status = 'available') with check (claimed_by = auth.uid());
create policy "donor deletes own" on public.donations for delete to authenticated using (auth.uid() = donor_id);

create or replace function public.impact_stats() returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'meals', coalesce((select sum(quantity) from donations where status in ('claimed','delivered')),0),
    'hotels', (select count(*) from profiles where organisation_type='Hotel'),
    'ngos', (select count(*) from profiles where organisation_type='NGO'),
    'donations', (select count(*) from donations));
$$;
grant execute on function public.impact_stats() to anon, authenticated;