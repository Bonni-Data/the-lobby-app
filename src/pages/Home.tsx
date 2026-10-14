import React from 'react';
import { useAuth } from '../lib/auth';
import { listCourses, listProgress, listOpportunities, listAttempts, completedIn, lessonCount, nextLesson, LEVEL_LABEL } from '../lib/data';
import { ArchProgress, ButtonLink, DoorCover, ErrorState, Screen, Spinner, TopBar, useAsync, formatDate } from '../components/ui';
import { TagChip } from '../components/opps';
import { FounderAvatar } from '../components/founder';
import { Link } from '../lib/router';
import { LuKeyRound, LuArrowRight } from 'react-icons/lu';

export default function Home() {
  const { displayName, plan } = useAuth();
  const data = useAsync(async () => {
    const [courses, progress, opps, attempts] = await Promise.all([
      listCourses(),
      listProgress(),
      listOpportunities().catch(() => []),
      listAttempts().catch(() => []),
    ]);
    return { courses, progress, opps, attempts };
  }, []);

  const first = (displayName || '').split(' ')[0];

  return (
    <Screen>
      <TopBar />
      <main className="page">
        <h1 className="h-hello">{first ? `Ciao, ${first}.` : 'Ciao.'}</h1>

        {data.loading && <Spinner />}
        {data.error && <ErrorState message={data.error} onRetry={data.reload} />}

        {data.data && (() => {
          const { courses, progress, opps, attempts } = data.data;
          const started = courses.filter((c) => completedIn(c, progress) > 0);
          const focus = started.find((c) => completedIn(c, progress) < lessonCount(c)) || courses[0];
          const doneLessons = progress.filter((p) => p.status === 'completed').length;
          return (
            <>
              {focus && (() => {
                const total = lessonCount(focus);
                const done = completedIn(focus, progress);
                const next = nextLesson(focus, progress);
                const finished = total > 0 && done === total;
                return (
                  <section className="resume" aria-label="Riprendi">
                    <ArchProgress value={total ? done / total : 0} size={64} />
                    <div className="resume__body">
                      <span className="resume__kicker">{done === 0 ? 'Inizia da qui' : finished ? 'Corso completato' : 'Riprendi il corso'}</span>
                      <h2 className="resume__title">{focus.title}</h2>
                      <span className="resume__meta">{done} di {total} lezioni · con Andrea Bonazzi</span>
                      {next ? (
                        <ButtonLink to={`/lezione/${next.id}`}>{done === 0 ? 'Inizia la prima lezione' : 'Continua'}</ButtonLink>
                      ) : (
                        <ButtonLink to={`/corso/${focus.slug}`} variant="secondary">Rivedi il corso</ButtonLink>
                      )}
                    </div>
                  </section>
                );
              })()}

              <p className="stats-line">
                <span><strong>{doneLessons}</strong> lezioni completate</span>
                <span><strong>{attempts.length}</strong> quiz svolti</span>
                <span><strong>{started.length}</strong> corsi iniziati</span>
              </p>

              <section className="block">
                <div className="block__head">
                  <h2 className="h-section">Corsi</h2>
                  <Link to="/academy" className="link-quiet">Vedi tutti</Link>
                </div>
                <div className="doors-row">
                  {courses.map((c) => (
                    <Link key={c.id} to={`/corso/${c.slug}`} className="door-card">
                      <DoorCover title={c.title} level={LEVEL_LABEL[c.level] + (c.access_level === 'premium' ? ' · Premium' : '')} />
                    </Link>
                  ))}
                </div>
              </section>

              <blockquote className="quote">
                <p>La sovranità appartiene al popolo, che la esercita nelle forme e nei limiti della Costituzione.</p>
                <cite>Costituzione italiana, articolo 1</cite>
              </blockquote>

              <section className="founder-note">
                <FounderAvatar size="m" />
                <div>
                  <p>“Ogni lezione che completi è un passo da cittadino a protagonista. Ci vediamo dentro.”</p>
                  <span>Andrea Bonazzi, founder e docente · <a href="#/andrea">la sua storia</a></span>
                </div>
              </section>

              <section className="block">
                <div className="block__head">
                  <h2 className="h-section">Opportunità</h2>
                  <Link to="/opportunita" className="link-quiet">Apri</Link>
                </div>
                {opps.length === 0 ? (
                  <p className="muted">Ogni mattina alle 7 raccogliamo in un solo posto bandi, tirocini, programmi e viaggi spesati dagli enti.</p>
                ) : (
                  <ul className="opp-list">
                    {opps.filter((o) => !o.locked).slice(0, 3).map((o) => (
                      <li key={o.id}>
                        <Link to="/opportunita" className="opp">
                          <TagChip tag={o.tag} />
                          <strong>{o.title}</strong>
                          {o.deadline && <span className="opp__deadline">Scade il {formatDate(o.deadline)}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {!plan.premium && opps.some((o) => o.locked) && (
                  <p className="small muted opp-more">
                    + altre {opps.filter((o) => o.locked).length} con <Link to="/premium" className="link-quiet">Premium</Link>
                  </p>
                )}
              </section>

              {!plan.premium && (
                <Link to="/premium" className="teaser">
                  <span className="teaser__arch" aria-hidden="true" />
                  <span className="teaser__kicker"><LuKeyRound aria-hidden="true" /> Premium · gratuito, su selezione</span>
                  <strong className="teaser__title">La sala riservata.</strong>
                  <span className="teaser__text">Cene a numero chiuso, incontri con Andrea, lezioni esclusive e tutte le opportunità. Non si compra: si conquista.</span>
                  <span className="teaser__go">{plan.application?.status === 'pending' ? 'Candidatura in valutazione' : 'Candidati'} <LuArrowRight aria-hidden="true" /></span>
                </Link>
              )}
            </>
          );
        })()}
      </main>
    </Screen>
  );
}
