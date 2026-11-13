create table if not exists public.user_study_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_study_data_state_is_object
    check (jsonb_typeof(state) = 'object')
);

alter table public.user_study_data enable row level security;

revoke all on public.user_study_data from anon, public;
grant select, insert, update on public.user_study_data to authenticated;

drop policy if exists "Users can read their own study data"
  on public.user_study_data;
create policy "Users can read their own study data"
  on public.user_study_data
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own study data"
  on public.user_study_data;
create policy "Users can create their own study data"
  on public.user_study_data
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own study data"
  on public.user_study_data;
create policy "Users can update their own study data"
  on public.user_study_data
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
