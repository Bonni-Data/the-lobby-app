import React from 'react';
import {
  getCourse, listProgress, completedIn, lessonCount, nextLesson, courseMinutes, courseOutline, listLive, isLive, LEVEL_LABEL, CATEGORY_NAME, categoryOf,
  OutlineLesson, LiveEdition, Course as CourseT,
} from '../lib/data';
import { ArchProgress, ButtonLink, Empty, ErrorState, Screen, Spinner, TopBar, useAsync, formatMinutes } from '../components/ui';
import { Link } from '../lib/router';
import { useAuth } from '../lib/auth';
import { TeacherLine } from '../components/founder';
import { DraftPanel } from '../components/drafts';
import { LivePanel, LiveTeaser } from '../components/live';
import { useGame } from '../components/game';
import { simulationMeta, XP } from '../lib/game';
import { LuCircleCheck, LuCirclePlay, LuTarget, LuKeyRound, LuLock, LuRadio, LuSwords, LuAward, LuArrowRight, LuSparkles } from 'react-icons/lu';

export default function Course({ slug }: { slug: string }) {
  const { plan } = useAuth();
  const data = useAsync(async () => {
    const [course, progress] = await Promise.all([getCourse(slug), listProgress()]);
    let outline: OutlineLesson[] = [];
    let live: LiveEdition | undefined;
    let sim: { title: string; role: string } | null = null;
    if (course && isLive(course)) live = (await listLive().catch(() => [] as LiveEdition[])).find((e) => e.course_id === course.id);
    else if (course && course.access_level === 'premium' && !plan.premium) outline = await courseOutline(course.id).catch(() => []);
    else if (course) sim = await simulationMeta(course.id).catch(() => null);
    return { course, progress, outline, live, sim };
  }, [slug, plan.premium]);

  return (
    <Screen>
      <TopBar back="/academy" />
      <main className="page page--flush">
        {data.loading && <Spinner />}
        {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
        {data.data && !data.data.course && <Empty title="Corso non trovato" text="Potrebbe essere stato spostato o non è più disponibile." />}
        {data.data?.course && (() => {
          const { course: c, progress, outline, live, sim } = data.data;
          if (isLive(c)) return <LiveCourse c={c} live={live} locked={c.access_level === 'premium' && !plan.premium} />;
          const total = lessonCount(c);
          const done = completedIn(c, progress);
          const next = nextLesson(c, progress);
          const doneSet = new Set(progress.filter((p) => p.status === 'completed').map((p) => p.lesson_id));
          const locked = c.access_level === 'premium' && !plan.premium;
          const coming = !!c.coming_soon && total === 0 && (!locked || outline.length === 0);
          return (
            <>
              <section className="course-hero">
                <div className="course-hero__arch" aria-hidden="true" />
                <span className="course-hero__level">
                  {CATEGORY_NAME[categoryOf(c)]} · {LEVEL_LABEL[c.level]}{c.access_level === 'premium' && ' · Premium'}{coming && ' · In arrivo'}
                </span>
                <h1 className="course-hero__title">{c.title}</h1>
                {c.subtitle && <p className="course-hero__sub">{c.subtitle}</p>}
                <TeacherLine tone="ivory" />
                {coming ? (
                  <p className="course-hero__done">In preparazione: {c.course_modules.length} capitoli in arrivo.</p>
                ) : (
                  <div className="course-hero__progress">
                    <ArchProgress value={total ? done / total : 0} size={44} />
                    <span>{done} di {total} lezioni<br />circa {courseMinutes(c)} minuti</span>
                  </div>
                )}
                {locked ? (
                  <ButtonLink to="/premium" block><LuKeyRound aria-hidden="true" /> Sblocca con Premium</ButtonLink>
                ) : next ? (
                  <ButtonLink to={`/lezione/${next.id}`} block>{done === 0 ? 'Inizia il corso' : 'Continua'}</ButtonLink>
                ) : total > 0 ? (
                  <p className="course-hero__done">Hai completato tutte le lezioni.</p>
                ) : null}
              </section>

              <div className="page">
                {plan.admin && <DraftPanel course={c} onPublished={data.reload} />}
                {c.description && <p className="lede">{c.description}</p>}

                {c.objectives.length > 0 && (
                  <section className="block">
                    <h2 className="h-section">Alla fine saprai</h2>
                    <ul className="objectives">
                      {c.objectives.map((o, i) => (
                        <li key={i}><LuTarget aria-hidden="true" />{o}</li>
                      ))}
                    </ul>
                  </section>
                )}

                <section className="block">
                  <h2 className="h-section">Programma</h2>
                  {locked ? (
                    <p className="muted">Anteprima: le lezioni si sbloccano entrando in Premium, gratuito e su selezione.</p>
                  ) : total === 0 && (
                    <p className="muted">Ecco il programma: le lezioni arrivano a breve.</p>
                  )}
                  <ol className="modules">
                    {c.course_modules.map((m) => (
                      <li key={m.id} className="module">
                        <h3 className="module__title">{m.title}</h3>
                        {m.description && <p className="muted small">{m.description}</p>}
                        <ul className="lessons">
                          {locked && outline.filter((l) => l.module_id === m.id).map((l) => (
                            <li key={l.lesson_id}>
                              <span className="lesson-row is-locked">
                                <LuLock className="lesson-row__icon" aria-hidden="true" />
                                <span className="lesson-row__title">{l.title}</span>
                                <span className="lesson-row__time">{formatMinutes(l.duration_seconds)}</span>
                              </span>
                            </li>
                          ))}
                          {m.lessons.map((l) => {
                            const isDone = doneSet.has(l.id);
                            return (
                              <li key={l.id}>
                                <Link to={`/lezione/${l.id}`} className={`lesson-row ${isDone ? 'is-done' : ''}`}>
                                  {isDone ? <LuCircleCheck className="lesson-row__icon ok" /> : <LuCirclePlay className="lesson-row__icon" />}
                                  <span className="lesson-row__title">{l.title}{l.status === 'draft' && <em className="chip chip--draft">Bozza</em>}</span>
                                  <span className="lesson-row__time">{formatMinutes(l.duration_seconds)}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    ))}
                  </ol>
                </section>

                {!locked && total > 0 && <Finale c={c} done={done} total={total} sim={sim} />}
              </div>
            </>
          );
        })()}
      </main>
    </Screen>
  );
}

/** End of a text course: the final simulation and the certificate. */
function Finale({ c, done, total, sim }: { c: CourseT; done: number; total: number; sim: { title: string; role: string } | null }) {
  const game = useGame();
  const cert = game?.courses.find((x) => x.course_id === c.id);
  const best = game?.sims.find((x) => x.course_id === c.id);
  const open = done >= total;
  return (
    <section className="block finale" aria-label="Fine corso">
      <h2 className="h-section">Il gran finale</h2>
      {sim && (
        <div className={`finale-card finale-card--sim ${open ? '' : 'is-locked'}`}>
          <span className="finale-card__kicker"><LuSwords aria-hidden="true" /> Simulazione finale</span>
          <strong className="finale-card__title">{sim.title}</strong>
          <span className="finale-card__role">Il tuo ruolo: {sim.role}</span>
          {!open ? (
            <p className="finale-card__text"><LuLock aria-hidden="true" /> Si sblocca quando completi le lezioni: {done} su {total}.</p>
          ) : best ? (
            <p className="finale-card__text">Il tuo risultato migliore: <b>{best.ending || 'conclusa'}</b>, {best.score} punti su {best.max}.</p>
          ) : (
            <p className="finale-card__text">Entra in scena e decidi tu. Ogni scelta ha conseguenze. Fino a {XP.sim} XP.</p>
          )}
          {open && <ButtonLink to={`/simulazione/${c.slug}`}>{best ? 'Rigioca' : 'Gioca la simulazione'} <LuArrowRight aria-hidden="true" /></ButtonLink>}
        </div>
      )}
      <div className={`finale-card finale-card--cert ${cert ? '' : 'is-locked'}`}>
        <span className="finale-card__kicker"><LuAward aria-hidden="true" /> Certificato</span>
        {cert ? (
          <>
            <strong className="finale-card__title">È tuo.</strong>
            <p className="finale-card__text">Condividilo su Instagram e LinkedIn: chi apre il link può verificare che è autentico.</p>
            <ButtonLink to={`/certificato/${cert.cert_id}`} variant="secondary">Apri il certificato <LuArrowRight aria-hidden="true" /></ButtonLink>
          </>
        ) : (
          <>
            <strong className="finale-card__title">Completa il corso, ricevi il certificato.</strong>
            <p className="finale-card__text"><LuSparkles aria-hidden="true" /> {total - done > 0 ? `Mancano ${total - done} ${total - done === 1 ? 'lezione' : 'lezioni'}.` : 'Ci siamo quasi.'} Vale +{XP.course} XP.</p>
          </>
        )}
      </div>
    </section>
  );
}

/** A course held live on Teams: programme for Premium, booking with a counter, Teams link once the date is set. */
function LiveCourse({ c, live, locked }: { c: CourseT; live?: LiveEdition; locked: boolean }) {
  return (
    <>
      <section className="course-hero">
        <div className="course-hero__arch" aria-hidden="true" />
        <span className="course-hero__level">
          {CATEGORY_NAME[categoryOf(c)]} · {LEVEL_LABEL[c.level]}{c.access_level === 'premium' && ' · Premium'} · Live
        </span>
        <h1 className="course-hero__title">{c.title}</h1>
        {c.subtitle && <p className="course-hero__sub">{c.subtitle}</p>}
        <TeacherLine tone="ivory" />
        <p className="course-hero__done"><LuRadio aria-hidden="true" /> Dal vivo su Microsoft Teams con Andrea</p>
        {locked && <ButtonLink to="/premium" block><LuKeyRound aria-hidden="true" /> Sblocca con Premium</ButtonLink>}
      </section>

      <div className="page">
        {locked ? <LiveTeaser edition={live} /> : <LivePanel course={c} edition={live} />}
        {c.description && <p className="lede">{c.description}</p>}

        {c.objectives.length > 0 && (
          <section className="block">
            <h2 className="h-section">Alla fine saprai</h2>
            <ul className="objectives">
              {c.objectives.map((o, i) => (
                <li key={i}><LuTarget aria-hidden="true" />{o}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="block">
          <h2 className="h-section">Il programma della live</h2>
          {locked ? (
            <p className="muted live-locked"><LuLock aria-hidden="true" /> Il programma completo è riservato a chi è in Premium, gratuito e su selezione.</p>
          ) : (
            <ol className="modules modules--live">
              {c.course_modules.map((m, i) => (
                <li key={m.id} className="module">
                  <span className="module__n">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="module__title">{m.title}</h3>
                  {m.description && <p className="muted small">{m.description}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
