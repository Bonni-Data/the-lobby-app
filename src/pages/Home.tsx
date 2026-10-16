import React from 'react';
import { useAuth } from '../lib/auth';
import { listCourses, listProgress, listOpportunities, listPath, pathView, completedIn, lessonCount, nextLesson, courseLabel, PATH_NAME, PathStage } from '../lib/data';
import { ArchProgress, ButtonLink, DoorCover, ErrorState, Screen, Spinner, TopBar, useAsync, formatDate, Ticker } from '../components/ui';
import { TagChip } from '../components/opps';
import { FounderBox } from '../components/founder';
import { VerifyBanner } from '../components/email';
import { LevelCard } from '../components/game';
import { Link } from '../lib/router';
import { LuKeyRound, LuArrowRight } from 'react-icons/lu';

export default function Home() {
  const { displayName, plan } = useAuth();
  const data = useAsync(async () => {
    const [courses, progress, opps, path] = await Promise.all([
      listCourses(),
      listProgress(),
      listOpportunities().catch(() => []),
      listPath().catch(() => [] as PathStage[]),
    ]);
    return { courses, progress, opps, path };
  }, []);

  const first = (displayName || '').split(' ')[0];

  return (
    <Screen>
      <TopBar />
      <main className="page">
        <h1 className="h-hello">{first ? <>Ciao, <span className="h-hello__name">{first}</span>.</> : 'Ciao.'}</h1>
        <VerifyBanner />

        {data.loading && <Spinner />}
        {data.error && <ErrorState message={data.error} onRetry={data.reload} />}

        {data.data && (() => {
          const { courses, progress, opps, path } = data.data;
          const pv = path.length ? pathView(path, courses, progress) : null;
          const started = courses.filter((c) => completedIn(c, progress) > 0);
          const fallback = started.find((c) => completedIn(c, progress) < lessonCount(c)) || courses.find((c) => lessonCount(c) > 0);
          const focus = pv?.next?.course || fallback;
          return (
            <>
              {pv && !pv.next && (
                <section className="resume" aria-label="Percorso completato">
                  <ArchProgress value={1} size={64} />
                  <div className="resume__body">
                    <span className="resume__kicker">{PATH_NAME}</span>
                    <h2 className="resume__title">Percorso completato.</h2>
                    <span className="resume__meta">Hai chiuso tutte le tappe. Adesso tocca a te: guarda le opportunità aperte.</span>
                    <ButtonLink to="/opportunita" variant="secondary">Vai alle opportunità</ButtonLink>
                  </div>
                </section>
              )}
              {focus && (!pv || pv.next) && (() => {
                const total = lessonCount(focus);
                const done = completedIn(focus, progress);
                const next = nextLesson(focus, progress);
                const first = done === 0 && (!pv || pv.doneStages === 0);
                return (
                  <section className="resume" aria-label="Riprendi">
                    <ArchProgress value={total ? done / total : 0} size={64} />
                    <div className="resume__body">
                      <span className="resume__kicker">
                        {pv?.next ? `Tappa ${pv.next.index + 1} di ${pv.freeStages} · ${pv.next.stage.title}` : first ? 'Inizia da qui' : 'Riprendi il corso'}
                      </span>
                      <h2 className="resume__title">{focus.title}</h2>
                      <span className="resume__meta">{done} di {total} lezioni · con Andrea Bonazzi</span>
                      {next ? (
                        <ButtonLink to={`/lezione/${next.id}`}>{first ? 'Inizia la prima lezione' : 'Continua'}</ButtonLink>
                      ) : (
                        <ButtonLink to={`/corso/${focus.slug}`} variant="secondary">Rivedi il corso</ButtonLink>
                      )}
                      {pv && <Link to="/academy" className="link-quiet resume__path">Vedi tutto il percorso <LuArrowRight aria-hidden="true" /></Link>}
                    </div>
                  </section>
                );
              })()}

              <LevelCard />

              <Ticker
                label="Oggi nella Lobby"
                items={[
                  ...(opps.length > 0 ? [`${opps.length} opportunità aperte`] : []),
                  ...opps.slice(0, 3).map((o) => `${o.title}${o.deadline ? ` · scade il ${formatDate(o.deadline)}` : ''}`),
                  ...(opps.some((o) => o.tag === 'viaggio') ? [`${opps.filter((o) => o.tag === 'viaggio').length} viaggi spesati dagli enti`] : []),
                  'Carta Giovani Nazionale: richiedila gratis',
                  ...courses.filter((c) => lessonCount(c) > 0).slice(0, 2).map((c) => `Corso: ${c.title}`),
                ]}
              />

              <FounderBox />

              <section className="block">
                <div className="block__head">
                  <h2 className="h-section">Corsi</h2>
                  <Link to="/academy" className="link-quiet">Vedi tutti</Link>
                </div>
                <div className="doors-row">
                  {courses.slice(0, 8).map((c) => (
                    <Link key={c.id} to={`/corso/${c.slug}`} className="door-card">
                      <DoorCover title={c.title} level={courseLabel(c)} />
                    </Link>
                  ))}
                </div>
              </section>

              <blockquote className="quote">
                <p>La sovranità appartiene al popolo, che la esercita nelle forme e nei limiti della Costituzione.</p>
                <cite>Costituzione italiana, articolo 1</cite>
              </blockquote>



              <section className="block">
                <div className="block__head">
                  <h2 className="h-section">Opportunità</h2>
                  <Link to="/opportunita" className="link-quiet">{opps.length > 3 ? `Vedi tutte (${opps.length})` : 'Apri'}</Link>
                </div>
                {opps.length === 0 ? (
                  <p className="muted">Ogni mattina alle 7 raccogliamo in un solo posto bandi, tirocini, programmi e viaggi spesati dagli enti.</p>
                ) : (
                  <ul className="opp-list">
                    {opps.slice(0, 3).map((o) => (
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
              </section>

              {!plan.premium && (
                <Link to="/premium" className="teaser">
                  <span className="teaser__arch" aria-hidden="true" />
                  <span className="teaser__kicker"><LuKeyRound aria-hidden="true" /> Premium · gratuito, su selezione</span>
                  <strong className="teaser__title">La sala riservata.</strong>
                  <span className="teaser__text">Masterclass live su Teams con Andrea, cene a numero chiuso e incontri faccia a faccia. Non si compra: si conquista.</span>
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
