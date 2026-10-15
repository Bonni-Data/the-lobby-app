import React from 'react';
import { listCourses } from '../lib/data';
import { levelFor, XP, BADGES } from '../lib/game';
import { useGame, BadgeGrid, LevelLadder, StreakFlame } from '../components/game';
import { ButtonLink, Screen, Spinner, TopBar, useAsync, formatDate } from '../components/ui';
import { Link } from '../lib/router';
import { LuAward, LuArrowRight, LuSwords } from 'react-icons/lu';

export default function Achievements() {
  const s = useGame();
  const courses = useAsync(() => listCourses(), []);
  const title = (id: string) => courses.data?.find((c) => c.id === id);

  return (
    <Screen>
      <TopBar back="/profilo" title="Traguardi" />
      <main className="page">
        {!s && <Spinner />}
        {s && (() => {
          const l = levelFor(s.xp);
          return (
            <>
              <section className="rank">
                <span className="rank__arch" aria-hidden="true" />
                <span className="rank__kicker">Livello {l.number} di 9</span>
                <h1 className="rank__name">{l.name}</h1>
                <p className="rank__line">{l.line}</p>
                <div className="xpbar xpbar--ivory" aria-hidden="true"><span style={{ width: `${Math.round(l.progress * 100)}%` }} /></div>
                <p className="rank__meta">
                  <span><strong>{s.xp}</strong> XP</span>
                  <span>{l.next ? <>ancora <b>{l.toNext}</b> per {l.next.name}</> : 'Hai raggiunto la cima'}</span>
                </p>
              </section>

              <section className="kpis" aria-label="I tuoi numeri">
                <div><StreakFlame s={s} /><span className="kpis__sub">record: {s.best_streak}</span></div>
                <div><strong>{s.lessons}</strong><span>lezioni completate</span></div>
                <div><strong>{s.checks}</strong><span>sfide vinte nelle lezioni</span></div>
                <div><strong>{s.badges.length}<small>/{BADGES.length}</small></strong><span>traguardi</span></div>
              </section>

              <section className="block">
                <h2 className="h-section">I tuoi certificati</h2>
                {s.courses.length === 0 ? (
                  <p className="muted">Completa tutte le lezioni di un corso: ricevi un certificato da condividere su Instagram e LinkedIn, con un link che ne verifica l’autenticità.</p>
                ) : (
                  <ul className="certs">
                    {s.courses.map((c) => (
                      <li key={c.cert_id}>
                        <Link to={`/certificato/${c.cert_id}`} className="certs__row">
                          <LuAward aria-hidden="true" />
                          <span><strong>{title(c.course_id)?.title || 'Corso completato'}</strong><small>{formatDate(c.completed_at)}</small></span>
                          <LuArrowRight aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {s.sims.length > 0 && (
                <section className="block">
                  <h2 className="h-section">Simulazioni giocate</h2>
                  <ul className="certs">
                    {s.sims.map((x) => {
                      const c = title(x.course_id);
                      return (
                        <li key={x.course_id}>
                          <Link to={c ? `/simulazione/${c.slug}` : '/academy'} className="certs__row">
                            <LuSwords aria-hidden="true" />
                            <span><strong>{x.ending || 'Simulazione conclusa'}</strong><small>{c?.title} · {x.score}/{x.max} punti</small></span>
                            <LuArrowRight aria-hidden="true" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <section className="block">
                <h2 className="h-section">Traguardi</h2>
                <BadgeGrid s={s} />
              </section>

              <section className="block">
                <h2 className="h-section">La scala</h2>
                <p className="muted small">Da cittadino a commissario europeo: ogni cosa che impari ti fa salire di un gradino.</p>
                <LevelLadder xp={s.xp} />
              </section>

              <section className="block">
                <h2 className="h-section">Come si guadagnano XP</h2>
                <ul className="xp-rules">
                  <li><span>Lezione completata</span><b>+{XP.lesson}</b></li>
                  <li><span>Sfida dentro la lezione, giusta al primo colpo</span><b>+{XP.check}</b></li>
                  <li><span>Quiz: ogni risposta giusta</span><b>+{XP.quizPerAnswer}</b></li>
                  <li><span>Quiz senza errori, bonus</span><b>+{XP.quizPerfect}</b></li>
                  <li><span>Corso completato, con certificato</span><b>+{XP.course}</b></li>
                  <li><span>Simulazione finale</span><b>fino a +{XP.sim}</b></li>
                </ul>
                <p className="muted small">Ogni cosa conta una volta sola: rifare un quiz migliora il punteggio, non lo raddoppia. La serie cresce se impari qualcosa di nuovo ogni giorno.</p>
              </section>

              <ButtonLink to="/academy" block>Vai ai corsi</ButtonLink>
            </>
          );
        })()}
      </main>
    </Screen>
  );
}
