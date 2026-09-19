-- Server-side rate limiting for Edge Functions.
-- Direct port of the Firebase `users/{uid}/rateLimit/{endpoint}` transaction.
-- SECURITY DEFINER + auth.uid() so clients cannot target other users.

create or replace function public.rate_limit_check(p_endpoint text, p_max_check int)
returns table (ok boolean, remaining int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits timestamptz[];
  v_now timestamptz := now();
begin
  select hits into v_hits
  from public.rate_limits
  where user_id = auth.uid() and endpoint = p_endpoint
  for update;

  v_hits := coalesce(v_hits, '{}');
  v_hits := array(
    select h
    from unnest(v_hits) as t(h)
    where h > v_now - interval '1 hour'
  );

  if cardinality(v_hits) >= p_max_check then
    return query select false, p_max_check - cardinality(v_hits);
    return;
  end if;

  v_hits := v_hits || v_now;

  insert into public.rate_limits (user_id, endpoint, hits, updated_at)
  values (auth.uid(), p_endpoint, v_hits, v_now)
  on conflict (user_id, endpoint)
  do update set hits = excluded.hits, updated_at = excluded.updated_at;

  return query select true, p_max_check - cardinality(v_hits);
end;
$$;

revoke all on function public.rate_limit_check(text, integer) from public;
grant execute on function public.rate_limit_check(text, integer) to authenticated;

-- Storage INSERT hardening (design section 6): owner folder + image + < 5MB.
-- Replaces the initial schema policy that only checked owner folder.
drop policy if exists "Users can upload own images" on storage.objects;

create policy "Users can upload own images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (metadata->>'mimetype') like 'image/%'
    and (coalesce((metadata->>'size')::bigint, 0) < 5242880)
  );