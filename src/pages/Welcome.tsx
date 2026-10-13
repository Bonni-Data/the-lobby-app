import React from 'react';
import { ArchMark, ButtonLink, DoorCover, Wordmark, useAsync } from '../components/ui';
import { listCourses, LEVEL_LABEL } from '../lib/data';
import { LuLandmark, LuGraduationCap, LuCompass, LuKeyRound } from 'react-icons/lu';

export default function Welcome() {
  const courses = useAsync(() => listCourses(), []);

  return (
    <div className="welcome">
      <section className="welcome__hero">
        <div className="welcome__arch" aria-hidden="true">
          <svg viewBox="0 0 300 380" preserveAspectRatio="xMidYMax meet">
            <path className="welcome__arch-outer" d="M20 380V150a130 130 0 0 1 260 0v230" />
            <path className="welcome__arch-inner" d="M80 380V170a70 70 0 0 1 140 0v210" />
          </svg>
        </div>
        <div className="welcome__brand">
          <Wordmark tone="ivory" size={44} />
        </div>
        <p className="welcome__tagline">Il primo investimento sei tu.</p>
        <p className="welcome__lead">
          Pochi minuti al giorno per capire come funzionano davvero Comuni, Parlamento ed Europa. E ogni mattina, nuove porte da aprire.
        </p>
        <div className="welcome__ctas">
          <ButtonLink to="/accedi?tab=registrati" variant="primary" block>
            Crea il tuo account
          </ButtonLink>
          <ButtonLink to="/accedi" variant="light" block>
            Ho già un account
          </ButtonLink>
        </div>
      </section>

      <section className="welcome__section">
        <h2 className="h-section">Dentro la Lobby</h2>
        <ul className="pillars">
          <li>
            <LuLandmark aria-hidden="true" />
            <div>
              <strong>Capire le istituzioni</strong>
              <span>Chi decide cosa, con quali soldi e in quanto tempo.</span>
            </div>
          </li>
          <li>
            <LuGraduationCap aria-hidden="true" />
            <div>
              <strong>Lezioni da pochi minuti</strong>
              <span>Video brevi, quiz per fissare i concetti, progressi salvati.</span>
            </div>
          </li>
          <li>
            <LuCompass aria-hidden="true" />
            <div>
              <strong>Occasioni ogni mattina</strong>
              <span>Viaggi, tirocini e programmi europei, aggiornati ogni giorno alle 7.</span>
            </div>
          </li>
          <li>
            <LuKeyRound aria-hidden="true" />
            <div>
              <strong>La sala riservata</strong>
              <span>Con Premium: cene, incontri dal vivo e lezioni esclusive.</span>
            </div>
          </li>
        </ul>
      </section>

      {courses.data && courses.data.length > 0 && (
        <section className="welcome__section">
          <h2 className="h-section">I primi corsi</h2>
          <div className="doors-row">
            {courses.data.map((c) => (
              <a key={c.id} href="#/accedi?tab=registrati" className="door-card">
                <DoorCover title={c.title} level={LEVEL_LABEL[c.level] + (c.access_level === 'premium' ? ' · Premium' : '')} />
              </a>
            ))}
          </div>
          <p className="muted small">Registrati gratis per entrare nei corsi.</p>
        </section>
      )}

      <footer className="welcome__footer">
        <ArchMark size={20} />
        <span>The Lobby Academy</span>
      </footer>
    </div>
  );
}
