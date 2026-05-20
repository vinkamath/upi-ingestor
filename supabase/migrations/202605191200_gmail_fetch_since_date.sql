alter table public.gmail_connections
  add column if not exists fetch_since_date date;

comment on column public.gmail_connections.fetch_since_date is
  'Earliest calendar date (IST) to import UPI emails from. When null, uses GMAIL_FETCH_DAYS_BACK.';
