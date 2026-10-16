-- THE LOBBY · reference copy of migrations mvp_30_path_badges (see my_stats), mvp_31_founder_metrics, mvp_32_content_tools_and_backup.
-- Applied on project unyqeshkfkvijehnlnex on 16 October 2026.
--
-- mvp_31: public.founder_metrics() — the same numbers as admin_metrics() plus email volume, database size, open reports,
--         live bookings and review progress, for the Monday report. Executable only by the database owner (never by the API).
--
-- mvp_32: tools for the monthly content review (database owner only) and the weekly backup.
--   revise_lesson_checks(p_lesson uuid, p_checks jsonb, p_note text)  replaces the in-lesson checks, logged in lesson_revisions
--   revise_simulation(p_course_slug text, p_scenario jsonb, p_note text) replaces a course simulation, logged in course_revisions
--   handle_content_report(p_report uuid)                                marks a learner's error report as handled
--   content_backup()                                                     all content as one JSON (service role only)
--   cron 'content-backup' every Sunday 04:40 UTC: email_queue('backup', admin) -> the mailer attaches content_backup()
--
-- Existing review tools (mvp_29c): revise_lesson, mark_lesson_reviewed, revise_quiz_question.

create table if not exists public.course_revisions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  kind text not null default 'simulation',
  old_value jsonb,
  new_value jsonb,
  note text,
  created_at timestamptz not null default now()
);
alter table public.course_revisions enable row level security;

create or replace function public.revise_lesson_checks(p_lesson uuid, p_checks jsonb, p_note text)
 returns jsonb language plpgsql security definer set search_path to ''
as $$
declare v_old jsonb; v_module uuid;
begin
  select module_id into v_module from public.lessons where id = p_lesson;
  if not found then raise exception 'not_found'; end if;
  if p_checks is null or jsonb_typeof(p_checks) <> 'array' or jsonb_array_length(p_checks) = 0 then raise exception 'bad_checks'; end if;
  if exists (select 1 from jsonb_array_elements(p_checks) e where coalesce(e ->> 'prompt', '') = '') then raise exception 'check_without_prompt'; end if;
  select checks into v_old from public.lesson_checks where lesson_id = p_lesson;
  insert into public.lesson_revisions (lesson_id, kind, old_value, new_value, note)
  values (p_lesson, 'lesson', jsonb_build_object('checks', v_old), jsonb_build_object('checks', p_checks), p_note);
  insert into public.lesson_checks (lesson_id, checks) values (p_lesson, p_checks)
  on conflict (lesson_id) do update set checks = excluded.checks;
  update public.lessons set updated_at = now() where id = p_lesson;
  update public.courses c set content_updated_at = now() from public.course_modules m where m.id = v_module and c.id = m.course_id;
  return jsonb_build_object('lesson', p_lesson, 'checks', jsonb_array_length(p_checks));
end $$;

create or replace function public.revise_simulation(p_course_slug text, p_scenario jsonb, p_note text)
 returns jsonb language plpgsql security definer set search_path to ''
as $$
declare v_course uuid; v_old jsonb;
begin
  select id into v_course from public.courses where slug = p_course_slug;
  if not found then raise exception 'not_found'; end if;
  if p_scenario is null or jsonb_typeof(p_scenario) <> 'object' then raise exception 'bad_scenario'; end if;
  select scenario into v_old from public.course_simulations where course_id = v_course;
  if v_old is null then raise exception 'no_simulation'; end if;
  insert into public.course_revisions (course_id, kind, old_value, new_value, note) values (v_course, 'simulation', v_old, p_scenario, p_note);
  update public.course_simulations set scenario = p_scenario, updated_at = now() where course_id = v_course;
  update public.courses set content_updated_at = now() where id = v_course;
  return jsonb_build_object('course', p_course_slug);
end $$;

create or replace function public.handle_content_report(p_report uuid)
 returns void language sql security definer set search_path to ''
as $$ update public.content_reports set status = 'gestita', handled_at = now() where id = p_report $$;

-- content_backup(): see the database for the full definition (courses, modules, lessons, checks, quizzes with answer keys,
-- simulations, path, live events, opportunities, revision history). No learner data.

revoke execute on function public.revise_lesson_checks(uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.revise_simulation(text, jsonb, text) from public, anon, authenticated;
revoke execute on function public.handle_content_report(uuid) from public, anon, authenticated;
revoke execute on function public.content_backup() from public, anon, authenticated;
grant execute on function public.content_backup() to service_role;
