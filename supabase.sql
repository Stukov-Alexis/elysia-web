create table if not exists public.images (
  id uuid primary key,
  filename text not null,
  url text not null,
  storage_path text,
  tags text[] not null default '{}',
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists images_tags_idx on public.images using gin(tags);

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('server', 'server', true)
on conflict (id) do nothing;

alter table public.images enable row level security;

drop policy if exists "Anyone can view images" on public.images;
create policy "Anyone can view images"
on public.images for select
using (true);

drop policy if exists "Authenticated users can insert images" on public.images;
create policy "Authenticated users can insert images"
on public.images for insert
to authenticated
with check (auth.uid() = uploaded_by);

drop policy if exists "Users can update their own images" on public.images;
create policy "Users can update their own images"
on public.images for update
to authenticated
using (auth.uid() = uploaded_by)
with check (auth.uid() = uploaded_by);

drop policy if exists "Users can delete their own images" on public.images;
create policy "Users can delete their own images"
on public.images for delete
to authenticated
using (auth.uid() = uploaded_by);