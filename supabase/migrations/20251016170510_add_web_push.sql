-- Web Push subscriptions table
create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.web_push_subscriptions enable row level security;

-- Policies: user can manage own subs
create policy "insert own sub"
  on public.web_push_subscriptions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "delete own sub"
  on public.web_push_subscriptions
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "select own subs"
  on public.web_push_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

