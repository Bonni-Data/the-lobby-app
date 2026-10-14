import React, { useEffect, useMemo, useState } from 'react';
import {
  listCourses, listProgress, completedIn, lessonCount, draftCount, courseOutline, LEVEL_LABEL, CATEGORIES, categoryOf,
  Course, Progress, OutlineLesson, CategoryId,
} from '../lib/data';
import { useAuth } from '../lib/auth';
import { ButtonLink, DoorCover, Empty, ErrorState, Screen, Spinner, TopBar, useAsync, formatMinutes } from '../components/ui';
import { Link, useLocation } from '../lib/router';
import { LuSearch, LuLock, LuKeyRound, LuTarget, LuPlay, LuGlobe, LuLandmark, LuBuilding2, LuMic } from 'react-icons/lu';
import { TeacherLine } from '../components/founder';

const CAT_ICON: Record<CategoryId, React.ReactNode> = {
  europa: <LuGlobe />,
  italia: <LuLandmark />,
  comune: <LuBuilding2 />,
  skill: <LuMic />,
};

function CourseRow({ c, progress, admin, locked }: { c: Course; progress: Progress[]; admin?: boolean; locked?: boolean }) {
  const total = lessonCount(c);
  const done = completedIn(c, progress);
  const coming = c.coming_soon && total === 0;
  const drafts = admin ? draftCount(c) : 0;
  return (
    <li>
      <Link to={`/corso/${c.slug}`} className={`course-row ${coming ? 'is-coming' : ''}`}>
        <DoorCover title={c.title} small />
        <div className="course-row__body">
          <span className="course-row__level">
            {LEVEL_LABEL[c.level]}
            {c.access_level === 'premium' && <em className="course-row__lock">{locked ? <LuLock aria-hidden="true" /> : <LuKeyRound aria-hidden="true" />} Premium</em>}
            {coming && !locked && <em className="chip chip--soon">In arrivo</em>}
            {drafts > 0 && <em className="chip chip--draft">{c.access_level === 'premium' ? 'Video da caricare' : 'Bozza da validare'}</em>}
          </span>
          <strong className="course-row__title">{c.title}</strong>
          {c.subtitle && <span className="course-row__sub">{c.subtitle}</span>}
          <span className="course-row__meta">
            {coming ? `${c.course_modules.length} ${c.course_modules.length === 1 ? 'capitolo' : 'capitoli'} in preparazione` : `${total} ${total === 1 ? 'lezione' : 'lezioni'}, circa ${Math.max(1, Math.round(c.course_modules.reduce((n, m) => n + m.lessons.reduce((k, l) => k + (l.duration_seconds || 0), 0), 0) / 60))} min`}
          </span>
          {total > 0 && !locked && (
            <span className="bar" aria-label={`${done} di ${total} lezioni completate`}>
              <span style={{ width: `${(done / total) * 100}%` }} />
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

/** What a premium course contains, shown to members who are not in Premium yet. */
function PreviewCard({ c, outline }: { c: Course; outline: OutlineLesson[] }) {
  const mins = Math.max(1, Math.round(outline.reduce((n, l) => n + (l.duration_seconds || 0), 0) / 60));
  return (
    <li className="preview">
      <Link to={`/corso/${c.slug}`} className="preview__link">
        <div className="preview__head">
          <span className="preview__level">{LEVEL_LABEL[c.level]} · Premium</span>
          <span className="preview__lock"><LuPlay aria-hidden="true" /> Video con Andrea</span>
        </div>
        <h3 className="preview__title">{c.title}</h3>
        {c.subtitle && <p className="preview__sub">{c.subtitle}</p>}
        {c.objectives.length > 0 && (
          <ul className="preview__goals">
            {c.objectives.slice(0, 3).map((o, i) => <li key={i}><LuTarget aria-hidden="true" /> {o}</li>)}
          </ul>
        )}
        {outline.length === 0 && c.course_modules.length > 0 && (
          <>
            <span className="preview__label">Cosa ti aspetta{c.coming_soon ? ' · in arrivo' : ''}</span>
            <ol className="preview__lessons">
              {c.course_modules.map((m) => (
                <li key={m.id}><LuLock aria-hidden="true" /> <span>{m.title}</span> <em /></li>
              ))}
            </ol>
          </>
        )}
        {outline.length > 0 && (
          <>
            <span className="preview__label">Cosa ti aspetta · {outline.length} lezioni, circa {mins} min</span>
            <ol className="preview__lessons">
              {outline.map((l) => (
                <li key={l.lesson_id}><LuLock aria-hidden="true" /> <span>{l.title}</span> <em>{formatMinutes(l.duration_seconds)}</em></li>
              ))}
            </ol>
          </>
        )}
      </Link>
    </li>
  );
}

export default function Academy() {
  const { plan } = useAuth();
  const { query } = useLocation();
  const data = useAsync(async () => {
    const [courses, progress] = await Promise.all([listCourses(), listProgress()]);
    const locked = courses.filter((c) => c.access_level === 'premium');
    const outlines: Record<string, OutlineLesson[]> = {};
    if (!plan.premium) {
      await Promise.all(locked.map(async (c) => { outlines[c.id] = await courseOutline(c.id).catch(() => []); }));
    }
    return { courses, progress, outlines };
  }, [plan.premium]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'tutti' | CategoryId>('tutti');

  useEffect(() => {
    const s = query.get('sezione');
    if (!data.data || !s) return;
    if (CATEGORIES.some((k) => k.id === s)) setCat(s as CategoryId);
    if (s === 'premium') document.getElementById('premium')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [data.data]);

  const filtered = useMemo(() => {
    if (!data.data) return [];
    const term = q.trim().toLowerCase();
    return data.data.courses.filter(
      (c) => !term || [c.title, c.subtitle, c.description].some((t) => (t || '').toLowerCase().includes(term)),
    );
  }, [data.data, q]);

  const sections = CATEGORIES
    .filter((k) => cat === 'tutti' || k.id === cat)
    .map((k) => ({ k, items: filtered.filter((c) => categoryOf(c) === k.id) }))
    .filter((s) => s.items.length > 0);
  const pending = plan.application?.status === 'pending';

  return (
    <Screen>
      <TopBar />
      <main className="page">
        <h1 className="h-page">Academy</h1>
        <p className="muted">Quattro aree, dal Comune all'Europa, più le competenze per muoverti dentro. Ogni corso finisce con un quiz.</p>
        <TeacherLine label="founder e docente di tutti i corsi" />

        <label className="search">
          <LuSearch aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca un corso" aria-label="Cerca un corso" />
        </label>
        <div className="chips" role="group" aria-label="Filtra per area">
          {[{ id: 'tutti', label: 'Tutti' }, ...CATEGORIES].map((k) => (
            <button key={k.id} className={`chip chip--btn ${cat === k.id ? 'is-on' : ''}`} onClick={() => setCat(k.id as 'tutti' | CategoryId)} aria-pressed={cat === k.id}>
              {k.label}
            </button>
          ))}
        </div>

        {data.loading && <Spinner />}
        {data.error && <ErrorState message={data.error} onRetry={data.reload} />}

        {data.data && (
          <>
            {sections.length === 0 && <Empty title="Nessun corso trovato" text="Prova con un'altra parola o un'altra area." />}
            {sections.map(({ k, items }) => {
              const free = items.filter((c) => c.access_level !== 'premium');
              const premium = items.filter((c) => c.access_level === 'premium');
              return (
                <section key={k.id} className="cat-section" id={`area-${k.id}`}>
                  <div className="cat-head">
                    <span className="cat-icon" aria-hidden="true">{CAT_ICON[k.id]}</span>
                    <div>
                      <h2 className="h-section">{k.label}</h2>
                      <p className="muted small">{k.blurb}</p>
                    </div>
                  </div>
                  {free.length > 0 && (
                    <ul className="course-list">
                      {free.map((c) => <CourseRow key={c.id} c={c} progress={data.data!.progress} admin={plan.admin} />)}
                    </ul>
                  )}
                  {premium.length > 0 && (plan.premium || plan.admin ? (
                    <ul className="course-list course-list--premium">
                      {premium.map((c) => <CourseRow key={c.id} c={c} progress={data.data!.progress} admin={plan.admin} />)}
                    </ul>
                  ) : (
                    <ul className="previews">
                      {premium.map((c) => <PreviewCard key={c.id} c={c} outline={data.data!.outlines[c.id] || []} />)}
                    </ul>
                  ))}
                </section>
              );
            })}

            <section className="academy-premium" id="premium">
              <span className="academy-premium__arch" aria-hidden="true" />
              <span className="academy-premium__kicker"><LuKeyRound aria-hidden="true" /> Area Premium</span>
              <h2 className="academy-premium__title">Masterclass e corsi avanzati.</h2>
              <p className="academy-premium__text">
                {plan.premium
                  ? 'Sei dentro: tutti i corsi Premium sono sbloccati. Buona strada.'
                  : 'Dove il corso base si ferma, Premium va avanti. Li trovi in ogni area, segnati con il lucchetto.'}
              </p>
              <p className="academy-premium__video">
                <span className="academy-premium__play" aria-hidden="true"><LuPlay /></span>
                Video lezioni registrate da Andrea in prima persona
              </p>
            </section>

            {!plan.premium && (
              <div className="academy-premium__cta">
                <ButtonLink to="/premium" block>{pending ? 'Candidatura in valutazione' : 'Candidati a Premium, è gratis'}</ButtonLink>
              </div>
            )}
          </>
        )}
      </main>
    </Screen>
  );
}
