alter table public.pending_reviews
  add constraint pending_reviews_transaction_id_key unique (transaction_id);
