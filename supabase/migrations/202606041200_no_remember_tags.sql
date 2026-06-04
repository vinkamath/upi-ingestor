alter table public.user_preferences
  add column if not exists no_remember_tags text[] not null default '{}';
