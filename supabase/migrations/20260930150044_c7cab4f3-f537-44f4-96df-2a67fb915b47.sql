drop policy if exists "public can read profiles for stats" on public.profiles;
drop policy if exists "public can read donations for stats" on public.donations;
revoke select on public.profiles from anon;
revoke select on public.donations from anon;
create or replace function public.impact_stats() returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'meals', coalesce((select sum(quantity) from donations where status in ('claimed','delivered')),0),
    'hotels', (select count(*) from profiles where organisation_type='Hotel'),
    'ngos', (select count(*) from profiles where organisation_type='NGO'),
    'donations', (select count(*) from donations));
$$;
grant execute on function public.impact_stats() to anon, authenticated;