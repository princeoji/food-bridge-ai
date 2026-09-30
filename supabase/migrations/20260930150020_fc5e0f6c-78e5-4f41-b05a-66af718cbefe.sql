revoke execute on function public.handle_new_user() from public, anon, authenticated;
create or replace function public.impact_stats() returns json language sql stable security invoker set search_path = public as $$ select '{}'::json $$;
drop function public.impact_stats();
create table public.impact_view_dummy(x int);
drop table public.impact_view_dummy;
grant select on public.donations to anon;
create policy "public can read donations for stats" on public.donations for select to anon using (true);
grant select on public.profiles to anon;
create policy "public can read profiles for stats" on public.profiles for select to anon using (true);