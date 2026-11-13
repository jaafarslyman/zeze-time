-- Shared anonymous board by design: anyone with the app URL can view and edit it.
create table if not exists public.board_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('note', 'photo')),
  note_text text,
  photo_caption text,
  photo_path text,
  note_color text not null default '#FFE3E7'
    check (note_color in ('#FFE3E7', '#FFF0A8', '#D8F3DC', '#D6EAFF', '#E9D5FF', '#FFC9A9')),
  frame_color text not null default '#FFFDF8'
    check (frame_color in ('#FFFDF8', '#F8E7E8', '#F1E4C8', '#DBEAFE', '#E6F4EA')),
  position_x double precision not null default 0.5
    check (position_x >= 0 and position_x <= 1),
  position_y double precision not null default 0.5
    check (position_y >= 0 and position_y <= 1),
  created_at timestamptz not null default now(),
  constraint board_items_content_shape check (
    (kind = 'note'
      and note_text is not null
      and char_length(note_text) between 1 and 500
      and photo_caption is null
      and photo_path is null)
    or
    (kind = 'photo'
      and note_text is null
      and photo_path is not null
      and (photo_caption is null or char_length(photo_caption) <= 1000))
  )
);

alter table public.board_items enable row level security;
revoke all on public.board_items from public;
grant select, insert, update on public.board_items to anon;

drop policy if exists "Anyone can read the shared board" on public.board_items;
create policy "Anyone can read the shared board"
  on public.board_items
  for select
  to anon
  using (true);

drop policy if exists "Anyone can add to the shared board" on public.board_items;
create policy "Anyone can add to the shared board"
  on public.board_items
  for insert
  to anon
  with check (true);

drop policy if exists "Anyone can edit the shared board" on public.board_items;
create policy "Anyone can edit the shared board"
  on public.board_items
  for update
  to anon
  using (true)
  with check (true);

-- Photos are stored as image files, not as base64 in the board table.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'zeze-board-photos',
  'zeze-board-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view shared board photos" on storage.objects;
create policy "Anyone can view shared board photos"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'zeze-board-photos');

drop policy if exists "Anyone can add shared board photos" on storage.objects;
create policy "Anyone can add shared board photos"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'zeze-board-photos');

drop policy if exists "Anyone can remove shared board photos" on storage.objects;

-- Enable live row events when the default Supabase publication is available.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'board_items'
    )
  then
    alter publication supabase_realtime add table public.board_items;
  end if;
end;
$$;
