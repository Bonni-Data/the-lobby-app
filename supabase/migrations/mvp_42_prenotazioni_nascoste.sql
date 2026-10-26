-- Decisione di Andrea del 25 ottobre 2026: «Non mostrare quante prenotazioni ci sono su classi o su cene».
-- Il numero di chi ha prenotato una lezione live o risposto «presente» a una cena lo vede solo il founder.
-- Per tutti gli altri yes_count è null; per una cena al completo vale quanto i posti, così l'app sa solo che il tavolo è pieno.
-- Stesse firme di prima (create or replace), nessun dato toccato. Applicata il 26 ottobre 2026.

create or replace function public.events_feed(p_kind text default null)
returns table(id uuid, kind text, title text, summary text, starts_at timestamptz, location text, seats integer,
              yes_count integer, my_response text, locked boolean)
language sql stable security definer set search_path to ''
as $function$
  with me as (select public.is_premium() as premium, public.is_admin() as admin, auth.uid() as uid),
  ev as (
    select e.*, (select count(*)::int from public.event_rsvps r where r.event_id = e.id and r.response = 'yes') as yes_n
    from public.premium_events e
    where e.status = 'published' and e.course_id is null
      and (p_kind is null or e.kind = p_kind)
      and (e.starts_at is null or e.starts_at > now() - interval '12 hours')
  )
  select ev.id, ev.kind,
         ev.title,
         case when me.premium then ev.summary end,
         ev.starts_at,
         case when me.premium then ev.location end,
         ev.seats,
         case when me.admin then ev.yes_n
              when ev.seats is not null and ev.yes_n >= ev.seats then ev.seats end,
         (select r.response from public.event_rsvps r where r.event_id = ev.id and r.user_id = me.uid),
         not me.premium
  from ev cross join me
  where me.uid is not null
  order by ev.starts_at nulls last;
$function$;

create or replace function public.live_courses()
returns table(course_id uuid, event_id uuid, yes_count integer, min_seats integer, my_response text, starts_at timestamptz, join_url text)
language sql stable security definer set search_path to ''
as $function$
  with me as (select auth.uid() as uid, public.is_admin() as admin, public.is_premium() as premium)
  select e.course_id, e.id,
         case when me.admin then (select count(*)::int from public.event_rsvps r where r.event_id = e.id and r.response = 'yes') end,
         coalesce(e.min_seats, 15),
         (select r.response from public.event_rsvps r where r.event_id = e.id and r.user_id = me.uid),
         e.starts_at,
         case when me.admin or (me.premium and exists (
                select 1 from public.event_rsvps r where r.event_id = e.id and r.user_id = me.uid and r.response = 'yes'))
              then (select k.join_url from public.live_links k where k.event_id = e.id) end
  from public.premium_events e cross join me
  where me.uid is not null and e.status = 'published' and e.course_id is not null;
$function$;

create or replace function public.rsvp_event(p_event uuid, p_response text)
returns jsonb
language plpgsql security definer set search_path to ''
as $function$
declare
  uid uuid := auth.uid();
  ev public.premium_events;
  yes_now int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if not public.is_premium() then raise exception 'premium_required'; end if;
  if p_response not in ('yes','no') then raise exception 'bad_response'; end if;
  select * into ev from public.premium_events where id = p_event and status = 'published';
  if not found then raise exception 'not_found'; end if;
  if ev.course_id is not null and p_response = 'yes' and not public.is_email_verified() then raise exception 'email_not_verified'; end if;
  if ev.starts_at is not null and ev.starts_at < now() then raise exception 'past_event'; end if;
  if p_response = 'yes' and ev.seats is not null then
    select count(*) into yes_now from public.event_rsvps r
     where r.event_id = p_event and r.response = 'yes' and r.user_id <> uid;
    if yes_now >= ev.seats then raise exception 'full'; end if;
  end if;
  insert into public.event_rsvps (event_id, user_id, response, updated_at)
  values (p_event, uid, p_response, now())
  on conflict (event_id, user_id) do update set response = excluded.response, updated_at = now();
  return jsonb_build_object(
    'response', p_response,
    'yes_count', case when public.is_admin()
                      then (select count(*) from public.event_rsvps r where r.event_id = p_event and r.response = 'yes') end);
end $function$;
