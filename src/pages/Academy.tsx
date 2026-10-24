import React, { useEffect, useMemo, useState } from 'react';
import {
  listCourses, listProgress, completedIn, lessonCount, draftCount, courseOutline, listLive, isLive, liveIsOver, LEVEL_LABEL, CATEGORIES, categoryOf,
  listPath, pathView, track, PATH_NAME, Course, Progress, OutlineLesson, CategoryId, LiveEdition, PathStage, PathView, StageView,
} from '../lib/data';
import { useAuth } from '../lib/auth';
import { ButtonLink, DoorCover, Empty, ErrorState, Screen, Spinner, TopBar, useAsync, formatMinutes } from '../components/ui';
import { Link, useLocation, navigate } from '../lib/router';
import { LuSearch, LuLock, LuKeyRound, LuTarget, LuGlobe, LuLandmark, LuBuilding2, LuMic, LuRadio, LuBookOpen, LuCheck, LuArrowRight, LuRoute, LuFlag, LuNewspaper } from 'react-icons/lu';
import { TeacherLine } from '../components/founder';

const CAT_ICON: Record<CategoryId, React.ReactNode> = {
  europa: <LuGlobe />,
  italia: <LuLandmark />,
  comune: <LuBuilding2 />,
  skill: <LuMic />,
  attualita: <LuNewspaper />,
};

function CourseRow({ c, progress, admin, locked, live, optional }: { c: Course; progress: Progress[]; admin?: boolean; locked?: boolean; live?: LiveEdition; optional?: boolean }) {
  const isL = isLive(c);
  const total = lessonCount(c);
  const done = completedIn(c, progress);
  const coming = !isL && c.coming_soon && total === 0;
  const drafts = admin && !isL ? draftCount(c) : 0;
  const ready = live && !live.starts_at && live.yes_count >= live.min_seats;
  return (
    <li>
      <Link to={`/corso/${c.slug}`} className={`course-row ${coming ? 'is-coming' : ''}`}>
        <DoorCover title={c.title} small />
        <div className="course-row__body">
          <span className="course-row__level">
            {LEVEL_LABEL[c.level]}
            {c.access_level === 'premium' && <em className="course-row__lock">{locked ? <LuLock aria-hidden="true" /> : <LuKeyRound aria-hidden="true" />} Premium</em>}
            {isL && <em className="chip chip--live"><LuRadio aria-hidden="true" /> Live</em>}
            {coming && !locked && <em className="chip chip--soon">In arrivo</em>}
            {optional && <em className="chip chip--soon">Facoltativo</em>}
            {drafts > 0 && <em className="chip chip--draft">Bozza da validare</em>}
            {admin && ready && <em className="chip chip--draft">Pronta: fissa la data</em>}
          </span>
          <strong className="course-row__title">{c.title}</strong>
          {c.subtitle && <span className="course-row__sub">{c.subtitle}</span>}
          <span className="course-row__meta">
            {isL ? liveMeta(live) : coming ? `${c.course_modules.length} ${c.course_modules.length === 1 ? 'capitolo' : 'capitoli'} in preparazione` : `${total} ${total === 1 ? 'lezione' : 'lezioni'}, circa ${Math.max(1, Math.round(c.course_modules.reduce((n, m) => n + m.lessons.reduce((k, l) => k + (l.duration_seconds || 0), 0), 0) / 60))} min`}
          </span>
          {!isL && total > 0 && !locked && (
            <span className="bar" aria-label={`${done} di ${total} lezioni completate`}>
              <span style={{ width: `${(done / total) * 100}%` }} />
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

function liveMeta(live?: LiveEdition) {
  if (!live) return 'Live su Teams con Andrea';
  if (live.starts_at && !liveIsOver(live)) {
    const d = new Date(live.starts_at);
    return `Live il ${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} alle ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return 'Live su Teams con Andrea · prenotazioni aperte';
}

/** What a premium course contains, shown to members who are not in Premium yet. Live courses keep the programme for Premium. */
function PreviewCard({ c, outline, live }: { c: Course; outline: OutlineLesson[]; live?: LiveEdition }) {
  const mins = Math.max(1, Math.round(outline.reduce((n, l) => n + (l.duration_seconds || 0), 0) / 60));
  const isL = isLive(c);
  return (
    <li className="preview">
      <Link to={`/corso/${c.slug}`} className="preview__link">
        <div className="preview__head">
          <span className="preview__level">{LEVEL_LABEL[c.level]} · Premium{isL ? ' · Live' : ''}</span>
          <span className="preview__lock">{isL ? <><LuRadio aria-hidden="true" /> Live su Teams</> : <><LuBookOpen aria-hidden="true" /> Lezioni e quiz</>}</span>
        </div>
        <h3 className="preview__title">{c.title}</h3>
        {c.subtitle && <p className="preview__sub">{c.subtitle}</p>}
        {c.objectives.length > 0 && (
          <ul className="preview__goals">
            {c.objectives.slice(0, 3).map((o, i) => <li key={i}><LuTarget aria-hidden="true" /> {o}</li>)}
          </ul>
        )}
        {isL && (
          <span className="preview__label">
            Dal vivo con Andrea su Teams · prenotazioni riservate a Premium
          </span>
        )}
        {!isL && outline.length === 0 && c.course_modules.length > 0 && (
          <>
            <span className="preview__label">Cosa ti aspetta{c.coming_soon ? ' · in arrivo' : ''}</span>
            <ol className="preview__lessons">
              {c.course_modules.map((m) => (
                <li key={m.id}><LuLock aria-hidden="true" /> <span>{m.title}</span> <em /></li>
              ))}
            </ol>
          </>
        )}
        {!isL && outline.length > 0 && (
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

function StageCard({ st, n, data, plan, isNext }: {
  st: StageView;
  n: number;
  data: { progress: Progress[]; outlines: Record<string, OutlineLesson[]>; liveBy: Record<string, LiveEdition> };
  plan: { premium: boolean; admin: boolean };
  isNext: boolean;
}) {
  const pct = st.total ? Math.round((st.done / st.total) * 100) : 0;
  const lockedPremium = st.premium && !plan.premium && !plan.admin;
  return (
    <li className={`stage stage--${st.state} ${st.premium ? 'stage--premium' : ''}`} id={`tappa-${st.id}`}>
      <div className="stage__rail" aria-hidden="true">
        <span className="stage__dot">{st.state === 'done' ? <LuCheck /> : st.premium ? <LuKeyRound /> : n}</span>
      </div>
      <div className="stage__body">
        <span className="stage__kicker">
          {st.premium ? 'Tappa extra · Premium' : `Tappa ${n}`}
          {st.state === 'done' && <em className="chip chip--done">Completata</em>}
          {isNext && <em className="chip chip--now">Sei qui</em>}
        </span>
        <h2 className="stage__title">{st.title}</h2>
        <p className="stage__skill"><LuTarget aria-hidden="true" /> {st.skill}</p>
        {st.summary && <p className="stage__sum">{st.summary}</p>}
        {!st.premium && st.total > 0 && (
          <span className="bar stage__bar" aria-label={`${st.done} di ${st.total} lezioni della tappa completate`}>
            <span style={{ width: `${pct}%` }} />
          </span>
        )}
        {lockedPremium ? (
          <ul className="previews">
            {st.courses.map((c) => <PreviewCard key={c.id} c={c} outline={data.outlines[c.id] || []} live={data.liveBy[c.id]} />)}
          </ul>
        ) : (
          <ul className="course-list">
            {st.courses.map((c) => (
              <CourseRow key={c.id} c={c} progress={data.progress} admin={plan.admin} live={data.liveBy[c.id]} optional={c.optional} />
            ))}
          </ul>
        )}
        {lockedPremium && (
          <ButtonLink to="/premium" variant="secondary">Candidati a Premium, è gratis</ButtonLink>
        )}
      </div>
    </li>
  );
}

function PathSection({ view, data, plan }: {
  view: PathView;
  data: { progress: Progress[]; outlines: Record<string, OutlineLesson[]>; liveBy: Record<string, LiveEdition> };
  plan: { premium: boolean; admin: boolean };
}) {
  const next = view.next;
  let n = 0;
  return (
    <>
      <section className="path-hero">
        <span className="path-hero__arch" aria-hidden="true" />
        <span className="path-hero__kicker"><LuRoute aria-hidden="true" /> Il percorso consigliato</span>
        <h2 className="path-hero__title">{PATH_NAME}.</h2>
        <p className="path-hero__text">
          {view.freeStages} tappe, dalla mappa del potere fino alle candidature. Ogni tappa ti dà una competenza. Puoi saltare dove
          vuoi: tutti i corsi sono aperti, il percorso è il nostro consiglio.
        </p>
        <div className="path-hero__meter" aria-label={`${view.doneStages} tappe completate su ${view.freeStages}`}>
          {view.stages.filter((v) => !v.premium).map((v) => (
            <span key={v.id} className={`path-hero__seg is-${v.state}`} />
          ))}
        </div>
        <span className="path-hero__count">{view.doneStages} di {view.freeStages} tappe completate</span>
        {next ? (
          <Link
            to={next.lesson ? `/lezione/${next.lesson.id}` : `/corso/${next.course.slug}`}
            className="next-step"
            onClick={() => track('stage_open', { stage: next.stage.id })}
          >
            <span className="next-step__kicker">Prossimo passo · Tappa {next.index + 1}</span>
            <strong className="next-step__title">{next.lesson ? next.lesson.title : next.course.title}</strong>
            <span className="next-step__meta">{next.course.title} · {completedIn(next.course, data.progress)} di {lessonCount(next.course)} lezioni</span>
            <span className="next-step__go">{completedIn(next.course, data.progress) === 0 && view.doneStages === 0 ? 'Inizia da qui' : 'Continua'} <LuArrowRight aria-hidden="true" /></span>
          </Link>
        ) : (
          <p className="path-hero__done"><LuFlag aria-hidden="true" /> Hai completato tutto il percorso. Adesso tocca a te: le opportunità ti aspettano.</p>
        )}
      </section>

      <ol className="stages">
        {view.stages.map((st) => {
          if (!st.premium) n += 1;
          return <StageCard key={st.id} st={st} n={n} data={data} plan={plan} isNext={!!next && next.stage.id === st.id} />;
        })}
      </ol>

      {view.others.length > 0 && (
        <section className="block">
          <h2 className="h-section">Nuovi corsi</h2>
          <p className="muted small">Appena usciti: presto avranno il loro posto nel percorso.</p>
          <ul className="course-list">
            {view.others.map((c) => <CourseRow key={c.id} c={c} progress={data.progress} admin={plan.admin} live={data.liveBy[c.id]} />)}
          </ul>
        </section>
      )}
    </>
  );
}

export default function Academy() {
  const { plan } = useAuth();
  const { query } = useLocation();
  const view = query.get('vista') === 'corsi' ? 'corsi' : 'percorso';
  const data = useAsync(async () => {
    const [courses, progress, live, path] = await Promise.all([
      listCourses(), listProgress(), listLive().catch(() => [] as LiveEdition[]), listPath().catch(() => [] as PathStage[]),
    ]);
    const locked = courses.filter((c) => c.access_level === 'premium' && !isLive(c));
    const outlines: Record<string, OutlineLesson[]> = {};
    if (!plan.premium) {
      await Promise.all(locked.map(async (c) => { outlines[c.id] = await courseOutline(c.id).catch(() => []); }));
    }
    const liveBy: Record<string, LiveEdition> = Object.fromEntries(live.map((e) => [e.course_id, e]));
    return { courses, progress, outlines, liveBy, path };
  }, [plan.premium]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'tutti' | CategoryId>('tutti');

  useEffect(() => { track('path_open', { view }); }, [view]);

  useEffect(() => {
    const s = query.get('sezione');
    if (!data.data || !s) return;
    if (CATEGORIES.some((k) => k.id === s)) { setCat(s as CategoryId); navigate('/academy?vista=corsi', true); }
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
  const pv = data.data && data.data.path.length > 0 ? pathView(data.data.path, data.data.courses, data.data.progress) : null;

  return (
    <Screen>
      <TopBar />
      <main className="page">
        <h1 className="h-page">Academy</h1>
        <TeacherLine label="founder e docente di tutti i corsi" />

        <div className="section-tabs" role="tablist" aria-label="Come vuoi vedere i corsi">
          <button role="tab" aria-selected={view === 'percorso'} className={view === 'percorso' ? 'is-on' : ''} onClick={() => navigate('/academy', true)}>
            Il percorso
          </button>
          <button role="tab" aria-selected={view === 'corsi'} className={view === 'corsi' ? 'is-on' : ''} onClick={() => navigate('/academy?vista=corsi', true)}>
            Tutti i corsi
          </button>
        </div>

        {data.loading && <Spinner />}
        {data.error && <ErrorState message={data.error} onRetry={data.reload} />}

        {data.data && view === 'percorso' && pv && <PathSection view={pv} data={data.data} plan={plan} />}

        {data.data && (view === 'corsi' || !pv) && (
          <>
            <p className="muted">Quattro aree, dal Comune all'Europa, più le competenze per muoverti dentro. Ogni corso finisce con un quiz.</p>
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
                      {premium.map((c) => <CourseRow key={c.id} c={c} progress={data.data!.progress} admin={plan.admin} live={data.data!.liveBy[c.id]} />)}
                    </ul>
                  ) : (
                    <ul className="previews">
                      {premium.map((c) => <PreviewCard key={c.id} c={c} outline={data.data!.outlines[c.id] || []} live={data.data!.liveBy[c.id]} />)}
                    </ul>
                  ))}
                </section>
              );
            })}
          </>
        )}

        {data.data && (
          <>
            <section className="academy-premium" id="premium">
              <span className="academy-premium__arch" aria-hidden="true" />
              <span className="academy-premium__kicker"><LuKeyRound aria-hidden="true" /> Area Premium</span>
              <h2 className="academy-premium__title">Dal vivo con Andrea.</h2>
              <p className="academy-premium__text">
                {plan.premium
                  ? 'Sei dentro: le masterclass live sono aperte per te. Prenota il posto dalla pagina del corso.'
                  : 'Il percorso è tutto gratis, e anche gli incontri online con Andrea. Premium aggiunge solo due cose che si fanno dal vivo: le lezioni live su Teams con Andrea e le cene di networking.'}
              </p>
              <p className="academy-premium__video">
                <span className="academy-premium__play" aria-hidden="true"><LuRadio /></span>
                Lezioni live su Teams con Andrea: prenoti il posto e ricevi data e link
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
