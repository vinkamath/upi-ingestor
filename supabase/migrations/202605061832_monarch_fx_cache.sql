alter table public.monarch_connections
  add column if not exists fx_usd_per_inr numeric(18,8),
  add column if not exists fx_rate_date date,
  add column if not exists fx_fetched_at timestamptz;
