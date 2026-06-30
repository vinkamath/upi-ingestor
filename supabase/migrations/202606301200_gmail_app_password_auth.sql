alter table public.gmail_connections
  alter column refresh_token_enc drop not null;

alter table public.gmail_connections
  add column if not exists auth_type text not null default 'oauth',
  add column if not exists app_password_enc jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gmail_connections_auth_type_check'
  ) then
    alter table public.gmail_connections
      add constraint gmail_connections_auth_type_check
      check (auth_type in ('oauth', 'app_password'));
  end if;
end $$;

comment on column public.gmail_connections.auth_type is
  'Gmail credential type. New connections use app_password over IMAP; oauth is kept for legacy rows.';

comment on column public.gmail_connections.app_password_enc is
  'AES-GCM encrypted Gmail app password used for IMAP login.';
