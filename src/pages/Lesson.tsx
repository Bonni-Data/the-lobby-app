import React, { useEffect, useState } from 'react';
import { getLesson, getCourse, listProgress, setProgress, Lesson as L } from '../lib/data';
import { Button, ButtonLink, Empty, ErrorState, Screen, Spinner, TopBar, useAsync, toast, formatMinutes } from '../components/ui';
import { Link } from '../lib/router';
import { LuCircleCheck, LuFileText, LuLink, LuPresentation, LuChevronDown } from 'react-icons/lu';
import { TeacherLine } from '../components/founder';
import { Prose } from '../components/prose';

export default function Lesson({ id }: { id: string }) {
  const data = useAsync(async () => {
    const lesson = await getLesson(id);
    if (!lesson) return null;
    const [course, progress] = await Promise.all([getCourse(lesson.course_modules.courses.slug), listProgress()]);
    return { lesson, course, progress };
  }, [id]);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openTranscript, setOpenTranscript] = useState(false);

  useEffect(() => {
    if (!data.data) return;
    const p = data.data.progress.find((x) => x.lesson_id === id);
    setDone(p?.status === 'completed');
    if (!p) setProgress(id, 'in_progress').catch(() => {});
  }, [data.data, id]);

  async function toggleDone() {
    setSaving(true);
    try {
      await setProgress(id, done ? 'in_progress' : 'completed');
      setDone(!done);
      if (!done) toast('Lezione completata.');
    } catch {
      toast('Salvataggio non riuscito. Riprova.');
    } finally {
      setSaving(false);
    }
  }

  const slug = data.data?.lesson?.course_modules?.courses?.slug;

  return (
    <Screen>
      <TopBar back={slug ? `/corso/${slug}` : '/academy'} />
      <main className="page page--flush">
        {data.loading && <Spinner />}
        {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
        {data.data === null && <Empty title="Lezione non disponibile" text="Accedi o torna al corso per scegliere un'altra lezione." />}
        {data.data && (() => {
          const { lesson, course } = data.data;
          const flat: L[] = course ? course.course_modules.flatMap((m) => m.lessons) : [];
          const idx = flat.findIndex((l) => l.id === lesson.id);
          const next = idx >= 0 ? flat[idx + 1] : undefined;
          const quiz = lesson.quizzes?.[0];
          return (
            <>
              {lesson.video_ref ? (
                <div className="player" aria-label="Video della lezione">
                  <video controls playsInline preload="metadata" src={lesson.video_ref} />
                </div>
              ) : (
                <div className="lesson-cover">
                  <span className="lesson-cover__arch" aria-hidden="true" />
                  <span className="lesson-cover__kicker">Lezione {idx + 1} di {flat.length || 1}</span>
                  <span className="lesson-cover__note">
                    {lesson.course_modules.courses.access_level === 'premium' ? 'Video lezione di Andrea in arrivo' : 'Lezione da leggere in 5 minuti'}
                  </span>
                </div>
              )}

              <div className="page">
                <p className="crumb">
                  <Link to={`/corso/${lesson.course_modules.courses.slug}`}>{lesson.course_modules.courses.title}</Link>
                  <span aria-hidden="true">/</span>
                  {lesson.course_modules.title}
                </p>
                <h1 className="h-title">{lesson.title}</h1>
                <TeacherLine label={formatMinutes(lesson.duration_seconds)} />
                {lesson.summary && <p className="lede">{lesson.summary}</p>}

                {lesson.transcript && !lesson.video_ref && <Prose text={lesson.transcript} />}

                {lesson.transcript && lesson.video_ref && (
                  <section className="disclosure">
                    <button className="disclosure__btn" onClick={() => setOpenTranscript(!openTranscript)} aria-expanded={openTranscript}>
                      Trascrizione <LuChevronDown className={openTranscript ? 'rot' : ''} />
                    </button>
                    {openTranscript && <div className="disclosure__body"><Prose text={lesson.transcript} /></div>}
                  </section>
                )}

                {lesson.lesson_assets?.length > 0 && (
                  <section className="block">
                    <h2 className="h-section">Materiali</h2>
                    <ul className="assets">
                      {lesson.lesson_assets.map((a) => (
                        <li key={a.id}>
                          <a href={a.ref} target="_blank" rel="noopener noreferrer">
                            {a.kind === 'slides' ? <LuPresentation /> : a.kind === 'link' ? <LuLink /> : <LuFileText />}
                            {a.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <div className="lesson-actions">
                  <Button variant={done ? 'secondary' : 'primary'} block loading={saving} onClick={toggleDone}>
                    {done ? (<><LuCircleCheck /> Completata</>) : 'Segna come completata'}
                  </Button>
                  {quiz && (
                    <ButtonLink to={`/quiz/${quiz.id}`} variant="secondary" block>
                      Fai il quiz
                    </ButtonLink>
                  )}
                  {next && (
                    <Link to={`/lezione/${next.id}`} className="next-lesson">
                      <span>Prossima lezione</span>
                      <strong>{next.title}</strong>
                    </Link>
                  )}
                </div>
              </div>
            </>
          );
        })()}
      </main>
    </Screen>
  );
}
