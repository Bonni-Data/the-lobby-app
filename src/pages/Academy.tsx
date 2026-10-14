import React, { useEffect, useMemo, useState } from 'react';
import {
  listCourses, listProgress, completedIn, lessonCount, courseMinutes, courseOutline, LEVEL_LABEL, Course, Progress, OutlineLesson,
} from '../lib/data';
import { useAuth } from '../lib/auth';
import { ButtonLink, DoorCover, Empty, ErrorState, Screen, Spinner, TopBar, useAsync, formatMinutes } from '../components/ui';
import { Link, useLocation } from '../lib/router';
import { LuSearch, LuLock, LuKeyRound, LuTarget } from 'react-icons/lu';
import { TeacherLine } from '../components/founder';

const LEVELS = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'base', label: 'Base' },
  { id: 'intermedio', label: 'Intermedio' },
  { id: 'avanzato', label: 'Avanzato' },
];

const COMING = ['Bandi europei: leggerli, scriverli, vincerli', 'Lavorare nelle istituzioni: concorsi, tirocini, colloqui', 'Comunicazione pubblica e parlare in pubblico'];

function CourseRow({ c, progress }: { c: Course; progress: Progress[] }) {
  const total = lessonCount(c);
  const done = completedIn(c, progress);
  const coming = c.coming_soon && total === 0;
  return (
    <li>
      <Link to={`/corso/${c.slug}`} className={`course-row ${coming ? 'is-coming' : ''}`}>
        <DoorCover title={c.title} small />
        <div className="course-row__body">
          <span className="course-row__level">{LEVEL_LABEL[c.level]}{c.access_level === 'premium' ? ' · Premium' : ''}{coming && <em className="chip chip--soon">In arrivo</em>}</span>
          <strong className="course-row__title">{c.title}</strong>
          {c.subtitle && <span className="course-row__sub">{c.subtitle}</span>}
          <span className="course-row__meta">
            {coming ? `${c.course_modules.length} capitoli in preparazione` : `${total} lezioni, circa ${courseMinutes(c)} min`}
          </span>
          {total > 0 && (
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
      <div className="preview__head">
        <span className="preview__level">{LEVEL_LABEL[c.level]} · Premium</span>
        <span className="preview__lock"><LuLock aria-hidden="true" /> Anteprima</span>
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
  const [level, setLevel] = useState('tutti');

  useEffect(() => {
    if (query.get('sezione') === 'premium' && data.data) {
      document.getElementById('premium')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [data.data]);

  const filtered = useMemo(() => {
    if (!data.data) return [];
    const term = q.trim().toLowerCase();
    return data.data.courses.filter(
      (c) =>
        (level === 'tutti' || c.level === level) &&
        (!term || [c.title, c.subtitle, c.description].some((t) => (t || '').toLowerCase().includes(term))),
    );
  }, [data.data, q, level]);

  const free = filtered.filter((c) => c.access_level !== 'premium');
  const premium = filtered.filter((c) => c.access_level === 'premium');
  const pending = plan.application?.status === 'pending';

  return (
    <Screen>
      <TopBar />
      <main className="page">
        <h1 className="h-page">Academy</h1>
        <p className="muted">Ogni corso è una porta: entri, segui le lezioni, verifichi con un quiz.</p>
        <TeacherLine label="founder e docente di tutti i corsi" />

        <label className="search">
          <LuSearch aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca un corso" aria-label="Cerca un corso" />
        </label>
        <div className="chips" role="group" aria-label="Filtra per livello">
          {LEVELS.map((l) => (
            <button key={l.id} className={`chip chip--btn ${level === l.id ? 'is-on' : ''}`} onClick={() => setLevel(l.id)} aria-pressed={level === l.id}>
              {l.label}
            </button>
          ))}
        </div>

        {data.loading && <Spinner />}
        {data.error && <ErrorState message={data.error} onRetry={data.reload} />}

        {data.data && (
          <>
            <section className="block">
              <h2 className="h-section">Per tutti</h2>
              {free.length === 0 ? (
                <Empty title="Nessun corso trovato" text="Prova con un'altra parola o un altro livello." />
              ) : (
                <ul className="course-list">
                  {free.map((c) => <CourseRow key={c.id} c={c} progress={data.data!.progress} />)}
                </ul>
              )}
            </section>

            <section className="academy-premium" id="premium">
              <span className="academy-premium__arch" aria-hidden="true" />
              <span className="academy-premium__kicker"><LuKeyRound aria-hidden="true" /> Area Premium</span>
              <h2 className="academy-premium__title">Masterclass e corsi avanzati.</h2>
              <p className="academy-premium__text">
                {plan.premium
                  ? 'Sei dentro: tutti i corsi Premium sono sbloccati. Buona strada.'
                  : 'Dove il corso base si ferma, Premium va avanti. Ecco un’anteprima di cosa ti aspetta dentro.'}
              </p>
            </section>

            {premium.length === 0 ? (
              <div className="coming">
                <span className="coming__label">In arrivo nell’area Premium</span>
                <ul>{COMING.map((t) => <li key={t}><LuLock aria-hidden="true" /> {t}</li>)}</ul>
              </div>
            ) : plan.premium ? (
              <ul className="course-list">
                {premium.map((c) => <CourseRow key={c.id} c={c} progress={data.data!.progress} />)}
              </ul>
            ) : (
              <ul className="previews">
                {premium.map((c) => <PreviewCard key={c.id} c={c} outline={data.data!.outlines[c.id] || []} />)}
              </ul>
            )}

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
