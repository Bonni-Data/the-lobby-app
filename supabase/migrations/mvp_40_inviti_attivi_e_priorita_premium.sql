-- mvp_40 · Inviti con un motivo (decisione di Andrea del 25/10/2026).
-- Chi porta 3 amici che completano almeno una lezione passa in cima alla lista delle candidature Premium.
-- Premium resta gratuito e su selezione: cambia solo l'ordine in cui Andrea legge le candidature.
--   - my_invite() restituisce anche 'active': gli invitati che hanno completato almeno una lezione;
--   - premium_applications_ranked(): per l'admin, le candidature con invitati e attivi, prima quelle in attesa
--     con almeno 3 amici attivi, poi le altre in attesa, poi le già valutate.

create or replace function public.invite_counts(p_user uuid)
 returns jsonb language sql stable security definer set search_path to ''
as $$
  with me as (select upper(invite_code) code from public.profiles where id = p_user),
  inv as (select u.id from auth.users u, me where me.code is not null and upper(u.raw_user_meta_data ->> 'invite') = me.code and u.id <> p_user)
  select jsonb_build_object(
    'joined', (select count(*) from inv),
    'active', (select count(*) from inv where exists (select 1 from public.lesson_progress lp where lp.user_id = inv.id and lp.status = 'completed')));
$$;
revoke all on function public.invite_counts(uuid) from public, anon, authenticated;

create or replace function public.my_invite()
 returns jsonb language plpgsql security definer set search_path to ''
as $$
declare v_uid uuid := auth.uid(); v_code text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select invite_code into v_code from public.profiles where id = v_uid;
  while v_code is null loop
    v_code := substr(translate(upper(encode(extensions.gen_random_bytes(9), 'base64')), '+/=0O1IL', ''), 1, 6);
    if length(v_code) < 6 or exists (select 1 from public.profiles where invite_code = v_code) then
      v_code := null;
    else
      update public.profiles set invite_code = v_code where id = v_uid;
    end if;
  end loop;
  return jsonb_build_object('code', v_code) || public.invite_counts(v_uid);
end $$;
grant execute on function public.my_invite() to authenticated;

create or replace function public.premium_applications_ranked()
 returns setof jsonb language plpgsql stable security definer set search_path to ''
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select to_jsonb(a) || public.invite_counts(a.user_id)
    from public.premium_applications a
    order by (a.status = 'pending') desc,
             ((public.invite_counts(a.user_id) ->> 'active')::int >= 3) desc,
             (public.invite_counts(a.user_id) ->> 'active')::int desc,
             a.created_at desc;
end $$;
grant execute on function public.premium_applications_ranked() to authenticated;
