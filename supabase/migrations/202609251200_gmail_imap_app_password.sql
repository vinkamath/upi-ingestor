alter table public.gmail_connections
  add column if not exists imap_app_password_enc jsonb;

comment on column public.gmail_connections.imap_app_password_enc is
  'Encrypted Gmail App Password for IMAP fetches. When set, used instead of the OAuth refresh token (which expires every 7 days while the Google app is unpublished).';
