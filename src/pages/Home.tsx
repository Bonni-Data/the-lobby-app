import React from 'react';
import { useAuth } from '../lib/auth';
import { listCourses, listProgress, listOpportunities, completedIn, lessonCount, nextLesson, LEVEL_LABEL, courseLabel } from '../lib/data';
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
    const [courses, progress, opps] = await Promise.all([
      listCourses(),
      listProgress(),
      listOpportunities().catch(() => []),
    ]);
    return { courses, progress, opps };
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
          const { courses, progress, opps } = data.data;
          const started = courses.filter((c) => completedIn(c, progress) > 0);
          const focus = started.find((c) => completedIn(c, progress) < lessonCount(c)) || courses.find((c) => lessonCount(c) > 0);
          const firstComing = courses.find((c) => c.coming_soon && lessonCount(c) === 0);
          return (
            <>
              {!focus && firstComing && (
                <section className="resume" aria-label="In arrivo">
                  <ArchProgress value={0} size={64} />
                  <div className="resume__body">
                    <span className="resume__kicker">Il primo corso sta arrivando</span>
                    <h2 className="resume__title">{firstComing.title}</h2>
                    <span className="resume__meta">{firstComing.subtitle}</span>
                    <ButtonLink to={`/corso/${firstComing.slug}`} variant="secondary">Guarda il programma</ButtonLink>
                  </div>
                </section>
              )}
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

              <LevelCard />

              <Ticker
                label="Oggi nella Lobby"
                items={[
                  ...(opps.length > 0 ? [`${opps.length} opportunità aperte`] : []),
                  ...opps.filter((o) => !o.locked).slice(0, 3).map((o) => `${o.title}${o.deadline ? ` · scade il ${formatDate(o.deadline)}` : ''}`),
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
                  <span className="teaser__text">Lezioni live su Teams con Andrea, corsi avanzati, cene a numero chiuso e tutte le opportunità. Non si compra: si conquista.</span>
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
