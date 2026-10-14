import React from 'react';
import { getCourse, listProgress, completedIn, lessonCount, nextLesson, courseMinutes, courseOutline, LEVEL_LABEL, OutlineLesson } from '../lib/data';
import { ArchProgress, ButtonLink, Empty, ErrorState, Screen, Spinner, TopBar, useAsync, formatMinutes } from '../components/ui';
import { Link } from '../lib/router';
import { useAuth } from '../lib/auth';
import { TeacherLine } from '../components/founder';
import { LuCircleCheck, LuCirclePlay, LuTarget, LuKeyRound, LuLock } from 'react-icons/lu';

export default function Course({ slug }: { slug: string }) {
  const { plan } = useAuth();
  const data = useAsync(async () => {
    const [course, progress] = await Promise.all([getCourse(slug), listProgress()]);
    let outline: OutlineLesson[] = [];
    if (course && course.access_level === 'premium' && !plan.premium) outline = await courseOutline(course.id).catch(() => []);
    return { course, progress, outline };
  }, [slug, plan.premium]);

  return (
    <Screen>
      <TopBar back="/academy" />
      <main className="page page--flush">
        {data.loading && <Spinner />}
        {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
        {data.data && !data.data.course && <Empty title="Corso non trovato" text="Potrebbe essere stato spostato o non è più disponibile." />}
        {data.data?.course && (() => {
          const { course: c, progress, outline } = data.data;
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
                  {LEVEL_LABEL[c.level]}{c.access_level === 'premium' && ' · Premium'}{coming && ' · In arrivo'}
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
                                  <span className="lesson-row__title">{l.title}</span>
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
              </div>
            </>
          );
        })()}
      </main>
    </Screen>
  );
}
