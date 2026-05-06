alter table public.transactions
  add column if not exists email_received_at timestamptz;

update public.transactions
set email_received_at = occurred_at
where email_received_at is null;

create index if not exists transactions_user_email_received_at_idx
  on public.transactions(user_id, email_received_at desc);
