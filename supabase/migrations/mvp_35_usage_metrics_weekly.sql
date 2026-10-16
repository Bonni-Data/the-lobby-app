-- THE LOBBY · migration mvp_35_usage_metrics_weekly, applied on project unyqeshkfkvijehnlnex on 16 October 2026.
--
-- public.usage_metrics(): web app usage analytics for the Monday report (owner only, never exposed to the API):
--   members, new_7d / new_prev_7d, active_7d / active_prev_7d, visits_7d / visits_prev_7d,
--   lessons_done_7d / lessons_done_prev_7d / lessons_done_total, quizzes_7d, quiz_avg_pct_7d, sims_7d,
--   courses_done_7d / courses_done_total, activated, activated_24h, eligible_d7, returned_d7,
--   opp_clicks_7d, shares_7d, invited, top_courses_7d, stages, sources_7d, sources_total.
--   Andrea's own account (user_roles) is excluded, as in founder_metrics().
-- maint.usage_weekly(snapshot_date, data): one snapshot of usage_metrics() per week, to follow progress over time.
-- cron 'usage-weekly-snapshot' every Monday 05:30 UTC (before the 08:46 Rome report). First snapshot: 16 October 2026.
--
-- The full function body is in the database: select pg_get_functiondef('public.usage_metrics()'::regprocedure);

create schema if not exists maint;
revoke all on schema maint from public, anon, authenticated;
create table if not exists maint.usage_weekly (
  snapshot_date date primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);
-- revoke execute on function public.usage_metrics() from public, anon, authenticated;
-- select cron.schedule('usage-weekly-snapshot', '30 5 * * 1',
--   $c$insert into maint.usage_weekly (snapshot_date, data) values (current_date, public.usage_metrics())
--      on conflict (snapshot_date) do update set data = excluded.data, created_at = now()$c$);
