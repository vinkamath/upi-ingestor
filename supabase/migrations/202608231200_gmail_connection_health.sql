alter table public.gmail_connections
  add column if not exists invalid_since timestamptz,
  add column if not exists last_error_code text,
  add column if not exists last_error_message text,
  add column if not exists last_success_at timestamptz;

comment on column public.gmail_connections.invalid_since is
  'When the stored refresh token was first seen rejected by Google (invalid_grant). Null means healthy; cleared on reconnect or the next successful fetch.';

comment on column public.gmail_connections.last_error_code is
  'Code of the most recent Gmail fetch failure: invalid_grant or fetch_failed.';

comment on column public.gmail_connections.last_error_message is
  'Human-readable reason for the most recent Gmail fetch failure, surfaced in Settings.';

comment on column public.gmail_connections.last_success_at is
  'Timestamp of the most recent successful Gmail fetch.';
