-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.

create table periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null check (end_date >= start_date)
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  color text not null default '#4f8cff' check (color ~ '^#[0-9a-fA-F]{6}$'),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  date date not null,          -- the day of a one-off, or the first day of a repeating series
  repeat_days int[],           -- 0=Sun .. 6=Sat; null = no repeat
  repeat_until date,
  skip_dates date[] not null default '{}'
);

create table activity_done (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  activity_id uuid not null references activities on delete cascade,
  date date not null,
  primary key (activity_id, date)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  done boolean not null default false,
  date date,                   -- null and no period = inbox
  period_id uuid references periods on delete cascade,  -- set = goal of that period
  position double precision not null default 0
);

-- Each user can only see and change their own rows.
alter table periods enable row level security;
alter table activities enable row level security;
alter table activity_done enable row level security;
alter table tasks enable row level security;
create policy own on periods for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on activities for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on activity_done for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on tasks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
