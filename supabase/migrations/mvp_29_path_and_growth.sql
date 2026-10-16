-- THE LOBBY · mvp_29: learning path, open opportunities, analytics, email engagement, lesson sources, referrals, public site data.

-- ---------- 1. Learning path ("Da cittadino a protagonista") ----------
create table if not exists public.path_stages (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  position int not null,
  title text not null,
  skill text not null,
  summary text,
  premium boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.path_items (
  course_id uuid primary key references public.courses(id) on delete cascade,
  stage_id text not null references public.path_stages(id) on delete cascade,
  position int not null,
  optional boolean not null default false
);
create index if not exists path_items_stage_idx on public.path_items (stage_id, position);
alter table public.path_stages enable row level security;
alter table public.path_items enable row level security;
create policy path_stages_select on public.path_stages for select to anon, authenticated using (true);
create policy path_items_select on public.path_items for select to anon, authenticated
  using (exists (select 1 from public.courses c where c.id = path_items.course_id and c.status = 'published') or (select public.is_admin()));
create policy path_stages_admin_write on public.path_stages for insert to authenticated with check ((select public.is_admin()));
create policy path_stages_admin_update on public.path_stages for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy path_stages_admin_delete on public.path_stages for delete to authenticated using ((select public.is_admin()));
create policy path_items_admin_write on public.path_items for insert to authenticated with check ((select public.is_admin()));
create policy path_items_admin_update on public.path_items for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy path_items_admin_delete on public.path_items for delete to authenticated using ((select public.is_admin()));
grant select on public.path_stages, public.path_items to anon, authenticated;
grant insert, update, delete on public.path_stages, public.path_items to authenticated;

insert into public.path_stages (id, position, title, skill, summary, premium) values
  ('orientarsi', 1, 'Orientarsi', 'Leggere la mappa del potere',
   'Chi decide cosa, in Italia e in Europa. La cartina che ti serve prima di tutto il resto.', false),
  ('il-comune', 2, 'Il Comune, da vicino', 'Muoverti nel livello più vicino a te',
   'Sindaco, giunta, consiglio e le regole del TUEL: dove si decide quello che vedi appena esci di casa.', false),
  ('come-decide-lo-stato', 3, 'Come decide lo Stato', 'Capire leggi, conti e numeri',
   'Come nasce una legge, da dove arrivano e dove vanno i soldi pubblici, come leggere i dati senza farsi fregare.', false),
  ('far-valere-le-idee', 4, 'Far valere le tue idee', 'Partecipare, parlare in pubblico, influenzare',
   'Gli strumenti per farti ascoltare: partecipazione, public speaking, advocacy.', false),
  ('entrare-in-gioco', 5, 'Entrare in gioco', 'Cogliere le opportunità e costruire il tuo percorso',
   'Bandi, tirocini, concorsi e programmi: come trovarli, come candidarti, come presentarti.', false),
  ('dal-vivo-con-andrea', 6, 'Dal vivo con Andrea', 'Fare il salto, con chi l’ha già fatto',
   'Le masterclass live di Premium: dietro le quinte, networking, candidature e public speaking avanzato.', true)
on conflict (id) do nothing;

insert into public.path_items (course_id, stage_id, position, optional)
select c.id, v.stage, v.pos, v.opt
from (values
  ('chi-decide-cosa', 'orientarsi', 1, false),
  ('europa-in-20-minuti', 'orientarsi', 2, false),
  ('storia-politica-italia', 'orientarsi', 3, true),
  ('comune-senza-segreti', 'il-comune', 1, false),
  ('tuel-regole-del-gioco', 'il-comune', 2, false),
  ('come-nasce-una-legge', 'come-decide-lo-stato', 1, false),
  ('conti-dello-stato', 'come-decide-lo-stato', 2, false),
  ('italia-in-numeri', 'come-decide-lo-stato', 3, false),
  ('farsi-sentire', 'far-valere-le-idee', 1, false),
  ('public-speaking-basi', 'far-valere-le-idee', 2, false),
  ('lobbying-advocacy', 'far-valere-le-idee', 3, false),
  ('mappa-opportunita', 'entrare-in-gioco', 1, false),
  ('bandi-europei', 'entrare-in-gioco', 2, false),
  ('entrare-nelle-istituzioni', 'entrare-in-gioco', 3, false),
  ('executive-presence', 'entrare-in-gioco', 4, false),
  ('dietro-le-quinte', 'dal-vivo-con-andrea', 1, false),
  ('networking-stakeholder', 'dal-vivo-con-andrea', 2, false),
  ('public-speaking-avanzato', 'dal-vivo-con-andrea', 3, false),
  ('candidarsi', 'dal-vivo-con-andrea', 4, false),
  ('farsi-strada-partito', 'dal-vivo-con-andrea', 5, false)
) as v(slug, stage, pos, opt)
join public.courses c on c.slug = v.slug
on conflict (course_id) do nothing;

-- ---------- 2. Opportunities: open to everyone, also without an account ----------
create or replace function public.opportunities_feed()
 returns table(id uuid, title text, organization text, category text, tag text, summary text, requirements text, covered text, location text, deadline date, deadline_note text, opens_on date, url text, source text, is_new boolean, locked boolean)
 language sql stable security definer set search_path to ''
as $$
  select o.id, o.title, o.organization, o.category, o.tag, o.summary, o.requirements, o.covered, o.location,
         o.deadline, o.deadline_note, o.opens_on, o.url, o.source,
         o.created_at > now() - interval '48 hours', false
  from public.opportunities o
  where o.status = 'published'
    and (o.deadline is null or o.deadline >= (now() at time zone 'Europe/Rome')::date)
  order by o.priority, o.deadline nulls last, o.created_at desc;
$$;
grant execute on function public.opportunities_feed() to anon, authenticated;

-- ---------- 3. Analytics without cookies ----------
-- Visitors are counted without any identifier; members' events are tied to their account (service improvement).
create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  path text,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists app_events_created_idx on public.app_events (created_at);
create index if not exists app_events_user_idx on public.app_events (user_id, created_at);
alter table public.app_events enable row level security;

create or replace function public.track(p_name text, p_path text default null, p_props jsonb default '{}'::jsonb)
 returns void language plpgsql security definer set search_path to ''
as $$
declare v_uid uuid := auth.uid();
begin
  if p_name is null or p_name not in (
    'visit', 'page', 'signup_open', 'opp_click', 'opp_share', 'invite_share', 'invite_copy',
    'path_open', 'stage_open', 'lesson_open', 'report_open', 'public_cta') then
    return;
  end if;
  if v_uid is not null then
    if (select count(*) from public.app_events where user_id = v_uid and created_at > now() - interval '1 hour') >= 400 then return; end if;
  elsif (select count(*) from public.app_events where user_id is null and created_at > now() - interval '1 minute') >= 300 then
    return;
  end if;
  insert into public.app_events (user_id, name, path, props)
  values (v_uid, p_name, left(p_path, 120),
          case when p_props is null or pg_column_size(p_props) > 1500 then '{}'::jsonb else p_props end);
end $$;
grant execute on function public.track(text, text, jsonb) to anon, authenticated;

-- ---------- 4. Email preferences and one-click unsubscribe ----------
create table if not exists public.email_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  digest boolean not null default true,
  reminders boolean not null default true,
  token uuid not null default gen_random_uuid() unique,
  updated_at timestamptz not null default now()
);
alter table public.email_prefs enable row level security;
create policy email_prefs_select_own on public.email_prefs for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
insert into public.email_prefs (user_id) select id from auth.users on conflict (user_id) do nothing;

create or replace function public.my_email_prefs()
 returns jsonb language sql stable security definer set search_path to ''
as $$
  select jsonb_build_object('digest', coalesce(e.digest, true), 'reminders', coalesce(e.reminders, true))
  from (select 1) x left join public.email_prefs e on e.user_id = auth.uid();
$$;
grant execute on function public.my_email_prefs() to authenticated;

create or replace function public.set_email_prefs(p_digest boolean, p_reminders boolean)
 returns jsonb language plpgsql security definer set search_path to ''
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into public.email_prefs (user_id, digest, reminders) values (auth.uid(), coalesce(p_digest, true), coalesce(p_reminders, true))
  on conflict (user_id) do update set digest = excluded.digest, reminders = excluded.reminders, updated_at = now();
  return public.my_email_prefs();
end $$;
grant execute on function public.set_email_prefs(boolean, boolean) to authenticated;

create or replace function public.email_unsubscribe(p_token uuid, p_what text default 'all')
 returns text language plpgsql security definer set search_path to ''
as $$
declare n int;
begin
  update public.email_prefs
     set digest = case when p_what in ('digest', 'all') then false else digest end,
         reminders = case when p_what in ('reminders', 'all') then false else reminders end,
         updated_at = now()
   where token = p_token;
  get diagnostics n = row_count;
  return case when n > 0 then 'ok' else 'invalid' end;
end $$;
grant execute on function public.email_unsubscribe(uuid, text) to anon, authenticated;

-- ---------- 5. Outbox: priorities, deferred sending, daily and monthly caps ----------
alter table public.email_outbox add column if not exists priority smallint not null default 5;
alter table public.email_outbox add column if not exists send_after timestamptz not null default now();
create index if not exists email_outbox_flush_idx on public.email_outbox (status, priority, send_after);
alter table public.mail_settings add column if not exists daily_cap int not null default 95;
alter table public.mail_settings add column if not exists monthly_cap int not null default 2900;

-- Queues an email; p_now = false leaves it to the 10-minute flush (bulk sends).
create or replace function public.email_queue(p_kind text, p_to text, p_name text, p_user uuid, p_payload jsonb, p_dedupe text, p_priority int default 5, p_now boolean default true)
 returns uuid language plpgsql security definer set search_path to ''
as $$
declare nid uuid;
begin
  if p_to is null or p_to = '' then return null; end if;
  insert into public.email_outbox (kind, to_email, to_name, user_id, payload, dedupe_key, priority)
  values (p_kind, lower(p_to), p_name, p_user, coalesce(p_payload, '{}'::jsonb), p_dedupe, greatest(1, least(9, coalesce(p_priority, 5))))
  on conflict (dedupe_key) do nothing
  returning id into nid;
  if nid is not null and p_now then
    perform net.http_post(
      url := 'https://unyqeshkfkvijehnlnex.supabase.co/functions/v1/mailer',
      body := jsonb_build_object('action', 'send', 'id', nid),
      headers := '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds := 20000);
  end if;
  return nid;
end $$;
revoke execute on function public.email_queue(text, text, text, uuid, jsonb, text, int, boolean) from public, anon, authenticated;

-- ---------- 6. Lesson sources, review history, error reports ----------
alter table public.lessons add column if not exists sources jsonb not null default '[]'::jsonb;
alter table public.lessons add column if not exists reviewed_at timestamptz;

create table if not exists public.lesson_revisions (
  id bigint generated always as identity primary key,
  lesson_id uuid references public.lessons(id) on delete cascade,
  question_id uuid,
  kind text not null default 'lesson' check (kind in ('lesson', 'review', 'quiz')),
  old_value jsonb,
  new_value jsonb,
  note text,
  created_at timestamptz not null default now()
);
alter table public.lesson_revisions enable row level security;
create policy lesson_revisions_admin on public.lesson_revisions for select to authenticated using ((select public.is_admin()));

-- Used by the monthly content review (database owner only): keeps the previous text for rollback.
create or replace function public.revise_lesson(p_lesson uuid, p_transcript text, p_summary text, p_sources jsonb, p_note text)
 returns jsonb language plpgsql security definer set search_path to ''
as $$
declare l public.lessons;
begin
  select * into l from public.lessons where id = p_lesson;
  if not found then raise exception 'not_found'; end if;
  if p_transcript is not null and length(p_transcript) < 0.6 * length(coalesce(l.transcript, '')) then
    raise exception 'transcript_too_short';
  end if;
  insert into public.lesson_revisions (lesson_id, kind, old_value, new_value, note)
  values (p_lesson, 'lesson',
          jsonb_build_object('summary', l.summary, 'transcript', l.transcript, 'sources', l.sources),
          jsonb_build_object('summary', coalesce(p_summary, l.summary), 'transcript', coalesce(p_transcript, l.transcript), 'sources', coalesce(p_sources, l.sources)),
          p_note);
  update public.lessons
     set transcript = coalesce(p_transcript, transcript), summary = coalesce(p_summary, summary),
         sources = coalesce(p_sources, sources), reviewed_at = now(), updated_at = now()
   where id = p_lesson;
  update public.courses c set content_updated_at = now()
    from public.course_modules m where m.id = l.module_id and c.id = m.course_id;
  return jsonb_build_object('lesson', p_lesson, 'reviewed_at', now());
end $$;
revoke execute on function public.revise_lesson(uuid, text, text, jsonb, text) from public, anon, authenticated;

create or replace function public.mark_lesson_reviewed(p_lesson uuid, p_sources jsonb, p_note text)
 returns jsonb language plpgsql security definer set search_path to ''
as $$
declare l public.lessons;
begin
  select * into l from public.lessons where id = p_lesson;
  if not found then raise exception 'not_found'; end if;
  insert into public.lesson_revisions (lesson_id, kind, old_value, new_value, note)
  values (p_lesson, 'review', jsonb_build_object('sources', l.sources), jsonb_build_object('sources', coalesce(p_sources, l.sources)), p_note);
  update public.lessons set sources = coalesce(p_sources, sources), reviewed_at = now() where id = p_lesson;
  return jsonb_build_object('lesson', p_lesson, 'reviewed_at', now());
end $$;
revoke execute on function public.mark_lesson_reviewed(uuid, jsonb, text) from public, anon, authenticated;

create or replace function public.revise_quiz_question(p_question uuid, p_prompt text, p_options jsonb, p_correct int, p_explanation text, p_note text)
 returns jsonb language plpgsql security definer set search_path to ''
as $$
declare q public.quiz_questions; k public.quiz_answer_keys; v_lesson uuid;
begin
  select * into q from public.quiz_questions where id = p_question;
  if not found then raise exception 'not_found'; end if;
  select * into k from public.quiz_answer_keys where question_id = p_question;
  select z.lesson_id into v_lesson from public.quizzes z where z.id = q.quiz_id;
  if p_options is not null and (jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) < 2) then raise exception 'bad_options'; end if;
  if p_correct is not null and (p_correct < 0 or p_correct >= jsonb_array_length(coalesce(p_options, q.options))) then raise exception 'bad_correct'; end if;
  insert into public.lesson_revisions (lesson_id, question_id, kind, old_value, new_value, note)
  values (v_lesson, p_question, 'quiz',
          jsonb_build_object('prompt', q.prompt, 'options', q.options, 'correct', k.correct_option, 'explanation', k.explanation),
          jsonb_build_object('prompt', coalesce(p_prompt, q.prompt), 'options', coalesce(p_options, q.options), 'correct', coalesce(p_correct, k.correct_option), 'explanation', coalesce(p_explanation, k.explanation)),
          p_note);
  update public.quiz_questions set prompt = coalesce(p_prompt, prompt), options = coalesce(p_options, options) where id = p_question;
  update public.quiz_answer_keys set correct_option = coalesce(p_correct, correct_option), explanation = coalesce(p_explanation, explanation) where question_id = p_question;
  return jsonb_build_object('question', p_question);
end $$;
revoke execute on function public.revise_quiz_question(uuid, text, jsonb, int, text, text) from public, anon, authenticated;

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete cascade,
  message text not null check (length(message) between 10 and 1000),
  status text not null default 'nuova' check (status in ('nuova', 'gestita')),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
alter table public.content_reports enable row level security;
create policy content_reports_admin_select on public.content_reports for select to authenticated using ((select public.is_admin()));
create policy content_reports_admin_update on public.content_reports for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
grant select, update on public.content_reports to authenticated;

create or replace function public.report_content(p_lesson uuid, p_message text)
 returns uuid language plpgsql security definer set search_path to ''
as $$
declare v_uid uuid := auth.uid(); nid uuid; v_title text; v_course text; s public.mail_settings;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if length(trim(coalesce(p_message, ''))) < 10 then raise exception 'too_short'; end if;
  if length(p_message) > 1000 then raise exception 'too_long'; end if;
  if (select count(*) from public.content_reports where user_id = v_uid and created_at > now() - interval '1 day') >= 5 then raise exception 'too_many'; end if;
  select l.title, c.title into v_title, v_course from public.lessons l join public.course_modules m on m.id = l.module_id join public.courses c on c.id = m.course_id where l.id = p_lesson;
  if v_title is null then raise exception 'not_found'; end if;
  insert into public.content_reports (user_id, lesson_id, message) values (v_uid, p_lesson, trim(p_message)) returning id into nid;
  select * into s from public.mail_settings where id = 1;
  perform public.email_queue('segnalazione', s.admin_email, 'Andrea', null,
    jsonb_build_object('lesson', v_title, 'course', v_course, 'lesson_id', p_lesson, 'message', trim(p_message), 'from', public.user_name(v_uid)),
    'segnalazione:' || nid, 2, true);
  return nid;
end $$;
grant execute on function public.report_content(uuid, text) to authenticated;

-- ---------- 7. Invite a friend ----------
alter table public.profiles add column if not exists invite_code text unique;

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
  return jsonb_build_object('code', v_code,
    'joined', (select count(*) from auth.users u where upper(u.raw_user_meta_data ->> 'invite') = v_code and u.id <> v_uid));
end $$;
grant execute on function public.my_invite() to authenticated;

-- ---------- 8. Engagement emails ----------
create or replace function public.user_streak_until(p_user uuid, p_day date)
 returns int language plpgsql stable security definer set search_path to ''
as $$
declare n int := 0; d date := p_day;
begin
  while n < 400 and exists (select 1 from public.xp_events e where e.user_id = p_user and (e.created_at at time zone 'Europe/Rome')::date = d) loop
    n := n + 1; d := d - 1;
  end loop;
  return n;
end $$;
revoke execute on function public.user_streak_until(uuid, date) from public, anon, authenticated;

-- What a member should do next: first course of the path not completed yet, and its next lesson.
create or replace function public.next_step(p_user uuid)
 returns jsonb language sql stable security definer set search_path to ''
as $$
  with done as (
    select lp.lesson_id from public.lesson_progress lp where lp.user_id = p_user and lp.status = 'completed'
  ), steps as (
    select s.position sp, s.title stage, i.position ip, c.slug, c.title course, c.id course_id,
           (select count(*) from public.course_modules m join public.lessons l on l.module_id = m.id where m.course_id = c.id and l.status = 'published') total,
           (select count(*) from public.course_modules m join public.lessons l on l.module_id = m.id join done d on d.lesson_id = l.id where m.course_id = c.id and l.status = 'published') completed
    from public.path_stages s join public.path_items i on i.stage_id = s.id join public.courses c on c.id = i.course_id
    where s.premium = false and i.optional = false and c.status = 'published'
  ), pick as (
    select * from steps where completed < total order by sp, ip limit 1
  )
  select coalesce((
    select jsonb_build_object('stage', p.stage, 'stage_n', p.sp, 'course', p.course, 'slug', p.slug, 'done', p.completed, 'total', p.total,
      'lesson_id', l.id, 'lesson', l.title)
    from pick p
    left join lateral (
      select l.id, l.title from public.course_modules m join public.lessons l on l.module_id = m.id
      where m.course_id = p.course_id and l.status = 'published' and not exists (select 1 from done d where d.lesson_id = l.id)
      order by m.position, l.position limit 1) l on true), '{}'::jsonb);
$$;
revoke execute on function public.next_step(uuid) from public, anon, authenticated;

create or replace function public.growth_payload(p_user uuid)
 returns jsonb language sql stable security definer set search_path to ''
as $$
  select jsonb_build_object(
    'next', public.next_step(p_user),
    'opps', coalesce((select jsonb_agg(jsonb_build_object('title', f.title, 'organization', f.organization, 'tag', f.tag, 'deadline', f.deadline, 'covered', f.covered))
                      from (select * from public.opportunities_feed() limit 3) f), '[]'::jsonb),
    'opps_total', (select count(*) from public.opportunities_feed()),
    'streak', public.user_streak_until(p_user, ((now() at time zone 'Europe/Rome')::date - 1)));
$$;
revoke execute on function public.growth_payload(uuid) from public, anon, authenticated;

create or replace function public.enqueue_welcome(p_user uuid)
 returns void language plpgsql security definer set search_path to ''
as $$
declare em text;
begin
  select email into em from auth.users where id = p_user;
  if em is null then return; end if;
  perform public.email_queue('benvenuto', em, public.user_name(p_user), p_user, public.growth_payload(p_user), 'benvenuto:' || p_user, 3, true);
end $$;
revoke execute on function public.enqueue_welcome(uuid) from public, anon, authenticated;

create or replace function public.on_profile_created()
 returns trigger language plpgsql security definer set search_path to ''
as $$
begin
  insert into public.email_prefs (user_id) values (new.id) on conflict (user_id) do nothing;
  if new.email_verified_at is not null then
    begin perform public.enqueue_welcome(new.id); exception when others then raise warning 'welcome not queued: %', sqlerrm; end;
  end if;
  return new;
end $$;
drop trigger if exists profiles_after_insert_growth on public.profiles;
create trigger profiles_after_insert_growth after insert on public.profiles for each row execute function public.on_profile_created();

create or replace function public.on_profile_verified()
 returns trigger language plpgsql security definer set search_path to ''
as $$
begin
  if old.email_verified_at is null and new.email_verified_at is not null then
    begin perform public.enqueue_welcome(new.id); exception when others then raise warning 'welcome not queued: %', sqlerrm; end;
  end if;
  return new;
end $$;
drop trigger if exists profiles_after_verify_growth on public.profiles;
create trigger profiles_after_verify_growth after update of email_verified_at on public.profiles for each row execute function public.on_profile_verified();

-- Hourly: first-step nudge, streak reminder (18:00), come-back (14 days), weekly digest (Monday 8:00), and limit alerts.
create or replace function public.enqueue_growth_emails()
 returns jsonb language plpgsql security definer set search_path to ''
as $$
declare
  s public.mail_settings;
  v_now timestamp := now() at time zone 'Europe/Rome';
  v_today date := v_now::date;
  v_hour int := extract(hour from v_now);
  v_dow int := extract(isodow from v_now);
  r record; n_first int := 0; n_streak int := 0; n_back int := 0; n_digest int := 0;
  v_day int; v_month int; v_subs int;
begin
  select * into s from public.mail_settings where id = 1;
  if not s.live then return jsonb_build_object('skipped', 'not_live'); end if;

  -- First step: 24-72 hours after signup, still no lesson completed.
  for r in
    select u.id, u.email from auth.users u
    join public.profiles p on p.id = u.id join public.email_prefs e on e.user_id = u.id
    where p.email_verified_at is not null and e.reminders
      and u.created_at between now() - interval '72 hours' and now() - interval '24 hours'
      and not exists (select 1 from public.lesson_progress lp where lp.user_id = u.id and lp.status = 'completed')
      and not exists (select 1 from public.email_outbox o where o.user_id = u.id and o.kind in ('benvenuto', 'primo_passo', 'serie', 'rientro') and o.created_at > now() - interval '20 hours')
  loop
    perform public.email_queue('primo_passo', r.email, public.user_name(r.id), r.id, public.growth_payload(r.id), 'primo_passo:' || r.id, 6, false);
    n_first := n_first + 1;
  end loop;

  -- Streak: at 18:00, members who learned yesterday and the day before but not today yet.
  if v_hour = 18 then
    for r in
      select u.id, u.email from auth.users u
      join public.profiles p on p.id = u.id join public.email_prefs e on e.user_id = u.id
      where p.email_verified_at is not null and e.reminders
        and exists (select 1 from public.xp_events x where x.user_id = u.id and (x.created_at at time zone 'Europe/Rome')::date = v_today - 1)
        and not exists (select 1 from public.xp_events x where x.user_id = u.id and (x.created_at at time zone 'Europe/Rome')::date = v_today)
        and not exists (select 1 from public.email_outbox o where o.user_id = u.id and o.kind = 'serie' and o.created_at > now() - interval '3 days')
    loop
      if public.user_streak_until(r.id, v_today - 1) >= 2 then
        perform public.email_queue('serie', r.email, public.user_name(r.id), r.id, public.growth_payload(r.id), 'serie:' || r.id || ':' || v_today, 5, false);
        n_streak := n_streak + 1;
      end if;
    end loop;
  end if;

  -- Come back: no activity for 14-60 days, at most once a month, at 11:00.
  if v_hour = 11 then
    for r in
      select u.id, u.email from auth.users u
      join public.profiles p on p.id = u.id join public.email_prefs e on e.user_id = u.id
      where p.email_verified_at is not null and e.reminders and u.created_at < now() - interval '14 days'
        and greatest(u.created_at,
              coalesce((select max(x.created_at) from public.xp_events x where x.user_id = u.id), u.created_at),
              coalesce((select max(lp.updated_at) from public.lesson_progress lp where lp.user_id = u.id), u.created_at))
            between now() - interval '60 days' and now() - interval '14 days'
        and not exists (select 1 from public.email_outbox o where o.user_id = u.id and o.kind = 'rientro' and o.created_at > now() - interval '30 days')
    loop
      perform public.email_queue('rientro', r.email, public.user_name(r.id), r.id, public.growth_payload(r.id), 'rientro:' || r.id || ':' || to_char(v_today, 'YYYY-MM'), 7, false);
      n_back := n_back + 1;
    end loop;
  end if;

  -- Weekly digest: Monday at 8:00.
  if v_dow = 1 and v_hour = 8 then
    for r in
      select u.id, u.email from auth.users u
      join public.profiles p on p.id = u.id join public.email_prefs e on e.user_id = u.id
      where p.email_verified_at is not null and e.digest
    loop
      perform public.email_queue('settimana', r.email, public.user_name(r.id), r.id, public.growth_payload(r.id), 'settimana:' || r.id || ':' || to_char(v_today, 'IYYY-IW'), 8, false);
      n_digest := n_digest + 1;
    end loop;
  end if;

  -- Limits of the free email plan: warn the founder before they bite.
  select count(*) into v_day from public.email_outbox where status = 'sent' and sent_at > now() - interval '24 hours';
  select count(*) into v_month from public.email_outbox where status = 'sent' and sent_at >= date_trunc('month', now());
  select count(*) into v_subs from public.email_prefs e join public.profiles p on p.id = e.user_id where e.digest and p.email_verified_at is not null;
  if v_day >= 80 then
    perform public.email_queue('avviso_limiti', s.admin_email, 'Andrea', null,
      jsonb_build_object('reason', 'giorno', 'day', v_day, 'month', v_month, 'subs', v_subs, 'daily_cap', s.daily_cap, 'monthly_cap', s.monthly_cap),
      'limiti:giorno:' || v_today, 1, true);
  end if;
  if v_month >= 2400 then
    perform public.email_queue('avviso_limiti', s.admin_email, 'Andrea', null,
      jsonb_build_object('reason', 'mese', 'day', v_day, 'month', v_month, 'subs', v_subs, 'daily_cap', s.daily_cap, 'monthly_cap', s.monthly_cap),
      'limiti:mese:' || to_char(v_today, 'YYYY-MM'), 1, true);
  end if;
  if v_subs >= 80 then
    perform public.email_queue('avviso_limiti', s.admin_email, 'Andrea', null,
      jsonb_build_object('reason', 'iscritti', 'day', v_day, 'month', v_month, 'subs', v_subs, 'daily_cap', s.daily_cap, 'monthly_cap', s.monthly_cap),
      'limiti:iscritti:' || to_char(v_today, 'YYYY-MM'), 1, true);
  end if;

  return jsonb_build_object('primo_passo', n_first, 'serie', n_streak, 'rientro', n_back, 'settimana', n_digest, 'sent_24h', v_day, 'sent_month', v_month, 'digest_subs', v_subs);
end $$;
revoke execute on function public.enqueue_growth_emails() from public, anon, authenticated;

create or replace function public.prune_app_events()
 returns int language sql security definer set search_path to ''
as $$
  with d as (delete from public.app_events where created_at < now() - interval '13 months' returning 1) select count(*)::int from d;
$$;
revoke execute on function public.prune_app_events() from public, anon, authenticated;

select cron.schedule('growth-emails', '7 * * * *', 'select public.enqueue_growth_emails()');
select cron.schedule('prune-app-events', '30 3 * * *', 'select public.prune_app_events()');

-- ---------- 9. Founder dashboard numbers ----------
create or replace function public.admin_metrics()
 returns jsonb language plpgsql stable security definer set search_path to ''
as $$
declare v jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  with u as (
    select id, created_at from auth.users where id not in (select user_id from public.user_roles)
  ), act as (
    select user_id, created_at from public.xp_events
    union all select user_id, updated_at from public.lesson_progress
    union all select user_id, created_at from public.app_events where user_id is not null
  )
  select jsonb_build_object(
    'members', (select count(*) from u),
    'new_7d', (select count(*) from u where created_at > now() - interval '7 days'),
    'new_30d', (select count(*) from u where created_at > now() - interval '30 days'),
    'active_7d', (select count(distinct a.user_id) from act a join u on u.id = a.user_id where a.created_at > now() - interval '7 days'),
    'activated', (select count(*) from u where exists (select 1 from public.lesson_progress lp where lp.user_id = u.id and lp.status = 'completed')),
    'activated_24h', (select count(*) from u where exists (select 1 from public.lesson_progress lp where lp.user_id = u.id and lp.status = 'completed' and lp.completed_at < u.created_at + interval '24 hours')),
    'eligible_d7', (select count(*) from u where created_at < now() - interval '7 days'),
    'returned_d7', (select count(*) from u where created_at < now() - interval '7 days'
                      and exists (select 1 from act a where a.user_id = u.id and a.created_at > u.created_at + interval '7 days')),
    'visits_7d', (select count(*) from public.app_events where name = 'visit' and created_at > now() - interval '7 days'),
    'opp_clicks_7d', (select count(*) from public.app_events where name = 'opp_click' and created_at > now() - interval '7 days'),
    'invited', (select count(*) from auth.users where coalesce(raw_user_meta_data ->> 'invite', '') <> ''),
    'applications_pending', (select count(*) from public.premium_applications where status = 'pending'),
    'premium', (select count(*) from public.memberships where status = 'active'),
    'reports_open', (select count(*) from public.content_reports where status = 'nuova'),
    'digest_subs', (select count(*) from public.email_prefs e join public.profiles p on p.id = e.user_id where e.digest and p.email_verified_at is not null),
    'sent_24h', (select count(*) from public.email_outbox where status = 'sent' and sent_at > now() - interval '24 hours'),
    'sent_month', (select count(*) from public.email_outbox where status = 'sent' and sent_at >= date_trunc('month', now())),
    'deferred', (select count(*) from public.email_outbox where status = 'queued' and send_after > now()),
    'stages', (select coalesce(jsonb_agg(jsonb_build_object('title', x.title, 'n', x.n) order by x.position), '[]'::jsonb) from (
        select s.title, s.position, count(distinct lp.user_id) n
        from public.path_stages s
        left join public.path_items i on i.stage_id = s.id
        left join public.course_modules m on m.course_id = i.course_id
        left join public.lessons l on l.module_id = m.id
        left join public.lesson_progress lp on lp.lesson_id = l.id and lp.status = 'completed' and lp.user_id in (select id from u)
        group by s.title, s.position) x),
    'signups_by_day', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', n) order by d), '[]'::jsonb) from (
        select (created_at at time zone 'Europe/Rome')::date d, count(*) n from u where created_at > now() - interval '30 days' group by 1) t),
    'sources', (select coalesce(jsonb_agg(jsonb_build_object('source', src, 'n', n) order by n desc), '[]'::jsonb) from (
        select coalesce(nullif(raw_user_meta_data ->> 'utm_source', ''), case when coalesce(raw_user_meta_data ->> 'invite', '') <> '' then 'invito' end, 'diretto') src, count(*) n
        from auth.users where created_at > now() - interval '30 days' and id not in (select user_id from public.user_roles) group by 1) t)
  ) into v;
  return v;
end $$;
grant execute on function public.admin_metrics() to authenticated;

-- ---------- 10. Public data for the indexable pages (no personal data) ----------
create or replace function public.lesson_excerpt(t text)
 returns text language sql immutable set search_path to ''
as $$
  select case when t is null then null else (
    select string_agg(x, E'\n## ' order by n)
    from unnest(string_to_array(t, E'\n## ')) with ordinality as a(x, n) where n <= 2) end;
$$;

create or replace function public.public_site()
 returns jsonb language sql stable security definer set search_path to ''
as $$
  select jsonb_build_object(
    'generated_at', now(),
    'stages', coalesce((select jsonb_agg(jsonb_build_object(
        'id', s.id, 'position', s.position, 'title', s.title, 'skill', s.skill, 'summary', s.summary, 'premium', s.premium,
        'courses', coalesce((select jsonb_agg(jsonb_build_object('slug', c.slug, 'optional', i.optional) order by i.position)
                             from public.path_items i join public.courses c on c.id = i.course_id
                             where i.stage_id = s.id and c.status = 'published'), '[]'::jsonb)) order by s.position)
      from public.path_stages s), '[]'::jsonb),
    'courses', coalesce((select jsonb_agg(jsonb_build_object(
        'slug', c.slug, 'title', c.title, 'subtitle', c.subtitle, 'description', c.description, 'audience', c.audience,
        'level', c.level, 'access', c.access_level, 'format', coalesce(c.format, 'testo'), 'category', c.category,
        'objectives', c.objectives, 'updated_at', greatest(c.updated_at, coalesce(c.content_updated_at, c.updated_at)),
        'modules', coalesce((select jsonb_agg(jsonb_build_object(
            'title', m.title,
            'lessons', coalesce((select jsonb_agg(jsonb_build_object(
                'id', l.id, 'title', l.title, 'summary', l.summary,
                'minutes', greatest(1, round(coalesce(l.duration_seconds, 0) / 60.0)),
                'excerpt', case when c.access_level = 'free' then public.lesson_excerpt(l.transcript) end,
                'sources', case when c.access_level = 'free' then l.sources end,
                'reviewed_at', l.reviewed_at, 'updated_at', l.updated_at) order by l.position)
              from public.lessons l where l.module_id = m.id and l.status = 'published'), '[]'::jsonb)) order by m.position)
          from public.course_modules m where m.course_id = c.id), '[]'::jsonb)) order by c.position nulls last)
      from public.courses c where c.status = 'published' and c.slug not like 'test-%'), '[]'::jsonb),
    'opportunities', coalesce((select jsonb_agg(to_jsonb(f) - 'locked' - 'is_new') from public.opportunities_feed() f), '[]'::jsonb));
$$;
grant execute on function public.public_site() to anon, authenticated;
