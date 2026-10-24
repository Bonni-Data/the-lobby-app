-- 24/10/2026, decisione di Andrea: Premium comprende solo le lezioni live su Teams con lui e le cene di networking.
-- Gli incontri con Andrea escono da Premium: li può chiedere chiunque abbia un account con l'email confermata,
-- solo online (videochiamata o telefono), al massimo 3 ogni 30 giorni.
create or replace function public.request_meeting(p_name text, p_email text, p_phone text, p_topic text, p_message text, p_link text, p_minutes integer, p_mode text, p_availability text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_name text := trim(coalesce(p_name, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_msg text := trim(coalesce(p_message, ''));
  v_link text := nullif(trim(coalesce(p_link, '')), '');
  v_avail text := nullif(trim(coalesce(p_availability, '')), '');
  v_admin text;
  r public.meeting_requests;
  v_topic_label text; v_mode_label text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.is_email_verified() then raise exception 'email_unverified'; end if;
  if length(v_name) < 2 or length(v_name) > 80 then raise exception 'bad_name'; end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or length(v_email) > 200 then raise exception 'bad_email'; end if;
  if v_phone is not null and v_phone !~ '^[0-9 +().\-]{6,20}$' then raise exception 'bad_phone'; end if;
  if p_topic not in ('testo', 'domande', 'consiglio', 'altro') then raise exception 'bad_topic'; end if;
  if length(v_msg) < 20 then raise exception 'too_short'; end if;
  if length(v_msg) > 1500 then raise exception 'too_long'; end if;
  if v_link is not null and (length(v_link) > 300 or v_link !~* '^https?://') then raise exception 'bad_link'; end if;
  if p_minutes not in (5, 15, 30) then raise exception 'bad_minutes'; end if;
  if p_mode not in ('video', 'telefono') then raise exception 'bad_mode'; end if;
  if v_avail is not null and length(v_avail) > 200 then raise exception 'too_long'; end if;
  -- At most 3 requests in any 30 days.
  if (select count(*) from public.meeting_requests m where m.user_id = v_uid and m.created_at > now() - interval '30 days') >= 3 then
    raise exception 'too_many';
  end if;

  insert into public.meeting_requests (user_id, name, email, phone, topic, message, link, minutes, mode, availability)
  values (v_uid, v_name, v_email, v_phone, p_topic, v_msg, v_link, p_minutes, p_mode, v_avail)
  returning * into r;

  v_topic_label := case p_topic when 'testo' then 'Rivedere un testo' when 'domande' then 'Fare domande' when 'consiglio' then 'Un consiglio' else 'Altro' end;
  v_mode_label := case p_mode when 'video' then 'Videochiamata' else 'Telefono' end;

  begin
    select admin_email into v_admin from public.mail_settings where id = 1;
    perform public.email_enqueue('incontro', v_admin, 'Andrea', v_uid,
      jsonb_build_object('id', r.id, 'name', v_name, 'email', v_email, 'phone', v_phone, 'topic', v_topic_label,
        'message', v_msg, 'link', v_link, 'minutes', p_minutes, 'mode', v_mode_label, 'availability', v_avail),
      'incontro:' || r.id);
    perform public.email_enqueue('incontro_ricevuto', v_email, v_name, v_uid,
      jsonb_build_object('topic', v_topic_label, 'minutes', p_minutes, 'mode', v_mode_label),
      'incontro_ricevuto:' || r.id);
  exception when others then
    raise warning 'request_meeting email: %', sqlerrm;
  end;

  return jsonb_build_object('id', r.id, 'created_at', r.created_at);
end $function$;
