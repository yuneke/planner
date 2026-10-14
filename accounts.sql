-- Usernames. Paste into Supabase > SQL Editor > New query and click Run (once, after schema.sql).

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$')
);
alter table profiles enable row level security;
create policy own on profiles for all using (id = auth.uid()) with check (id = auth.uid());

-- New accounts get the username they typed when signing up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_user_meta_data ? 'username' then
    insert into public.profiles (id, username) values (new.id, lower(new.raw_user_meta_data ->> 'username'));
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Signing in with a username: returns the account's email only when the password is right,
-- so nobody can look up someone else's email from their username.
-- ponytail: no rate limit on this call (bcrypt keeps guesses slow); move it to an Edge Function if that matters.
create function public.login_email(login text, password text) returns text
language sql stable security definer set search_path = '' as $$
  select u.email from auth.users u join public.profiles p on p.id = u.id
  where p.username = lower(login)
    and case when u.encrypted_password like '$2%'
             then u.encrypted_password = extensions.crypt(password, u.encrypted_password)
             else false end
$$;
revoke all on function public.login_email from public;
grant execute on function public.login_email to anon, authenticated;
