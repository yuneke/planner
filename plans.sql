-- Activities without a time yet ("unplaced"). Paste into Supabase > SQL Editor > New query and click Run (once, after schema.sql).
alter table activities
  alter column start_time drop not null,
  alter column end_time drop not null,
  add column duration int check (duration between 5 and 840),  -- minutes, used when placing
  add column position double precision not null default 0,     -- order in the Unplaced list
  add constraint placed_or_not check ((start_time is null) = (end_time is null)),
  add constraint unplaced_once check (start_time is not null or repeat_days is null);
