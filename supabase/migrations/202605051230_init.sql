create extension if not exists pgcrypto;

create table if not exists public.gmail_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_address text not null,
  refresh_token_enc jsonb not null,
  last_history_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monarch_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  credential_enc jsonb not null,
  default_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.telegram_links (
  user_id uuid unique references auth.users(id) on delete cascade,
  chat_id text unique,
  link_code text unique not null,
  linked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_type text not null check (match_type in ('regex', 'contains', 'equals')),
  field text not null check (field in ('merchant', 'sender', 'body')),
  pattern text not null,
  category text not null,
  priority int not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.merchant_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_key text not null,
  category text not null,
  created_at timestamptz not null default now(),
  unique(user_id, merchant_key)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_message_id text not null,
  bank_ref_id text not null,
  amount numeric(12,2) not null,
  merchant_raw text not null,
  merchant_normalized text not null,
  occurred_at timestamptz not null,
  category text,
  status text not null check (status in ('pending', 'needs_review', 'published', 'failed')) default 'pending',
  published_id text,
  raw_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, bank_ref_id)
);

create table if not exists public.pending_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  telegram_message_id text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.gmail_connections enable row level security;
alter table public.monarch_connections enable row level security;
alter table public.telegram_links enable row level security;
alter table public.rules enable row level security;
alter table public.merchant_mappings enable row level security;
alter table public.transactions enable row level security;
alter table public.pending_reviews enable row level security;

create policy "own gmail_connections" on public.gmail_connections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own monarch_connections" on public.monarch_connections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own telegram_links" on public.telegram_links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rules" on public.rules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own merchant_mappings" on public.merchant_mappings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own transactions" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own pending_reviews" on public.pending_reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
