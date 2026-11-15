-- Lets a signed-in user permanently delete their own account.
-- The browser can't delete from auth.users with the anon key, so this runs
-- as the function owner (security definer) and only ever touches auth.uid().
-- App rows are deleted explicitly so this works whether or not the foreign
-- keys to auth.users cascade.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  delete from public.watched_movies where user_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
