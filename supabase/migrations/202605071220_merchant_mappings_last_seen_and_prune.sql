-- Track recency for per-user merchant mapping LRU and provide a pruning RPC.

alter table public.merchant_mappings
add column if not exists last_seen_at timestamptz not null default now();

create index if not exists merchant_mappings_user_last_seen_idx
on public.merchant_mappings (user_id, last_seen_at desc);

create or replace function public.prune_merchant_mappings(p_user_id uuid, p_keep int default 5000)
returns void
language plpgsql
as $$
begin
  if p_keep is null or p_keep < 0 then
    raise exception 'p_keep must be >= 0';
  end if;

  delete from public.merchant_mappings mm
  where mm.user_id = p_user_id
    and mm.id in (
      select id
      from public.merchant_mappings
      where user_id = p_user_id
      order by last_seen_at desc
      offset p_keep
    );
end;
$$;

