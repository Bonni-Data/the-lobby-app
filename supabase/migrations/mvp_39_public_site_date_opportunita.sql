-- mvp_39 · Pagine pubbliche: una pagina per ogni opportunità (25/10/2026).
-- public_site() espone anche la data in cui l'opportunità è entrata nell'app (created_at) e l'ultimo controllo sulla fonte
-- (checked_at): servono a Google per le schede delle offerte (datePosted) e a chi legge per fidarsi. Nessun dato personale.
create or replace function public.public_site()
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
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
    'opportunities', coalesce((select jsonb_agg(
          (to_jsonb(f) - 'locked' - 'is_new' - 'ordinality')
          || jsonb_build_object('created_at', o.created_at, 'checked_at', o.last_checked_at)
          order by f.ordinality)
      from public.opportunities_feed() with ordinality f
      left join public.opportunities o on o.id = f.id), '[]'::jsonb));
$function$;
