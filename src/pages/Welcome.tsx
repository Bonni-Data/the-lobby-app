import React from 'react';
import { ArchMark, ButtonLink, DoorCover, Wordmark, useAsync, useReveal } from '../components/ui';
import { listCourses, courseLabel } from '../lib/data';
import { FounderCard } from '../components/founder';
import { LuLandmark, LuGraduationCap, LuCompass, LuKeyRound } from 'react-icons/lu';

export default function Welcome() {
  const courses = useAsync(() => listCourses(), []);
  const ref = React.useRef<HTMLDivElement>(null);
  useReveal(ref);

  return (
    <div className="welcome" ref={ref}>
      <section className="welcome__hero">
        <div className="welcome__arch" aria-hidden="true">
          <svg viewBox="0 0 300 380" preserveAspectRatio="xMidYMax meet">
            <defs>
              <radialGradient id="beam" cx="50%" cy="100%" r="75%">
                <stop offset="0%" stopColor="#FF7058" stopOpacity="0.55" />
                <stop offset="60%" stopColor="#FF7058" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#FF7058" stopOpacity="0" />
              </radialGradient>
            </defs>
            <path className="welcome__beam" d="M80 380V170a70 70 0 0 1 140 0v210Z" fill="url(#beam)" />
            <path className="welcome__arch-outer" d="M20 380V150a130 130 0 0 1 260 0v230" />
            <path className="welcome__arch-inner" d="M80 380V170a70 70 0 0 1 140 0v210" />
          </svg>
          <span className="sparks">{Array.from({ length: 7 }).map((_, i) => <i key={i} />)}</span>
        </div>
        <div className="welcome__brand">
          <Wordmark tone="ivory" size={44} />
        </div>
        <p className="welcome__tagline">Cittadini si nasce.<br />Protagonisti si diventa.</p>
        <p className="welcome__lead">
          Pochi minuti al giorno per capire come funzionano davvero Comuni, Parlamento ed Europa. Perché chi conosce le regole può cambiare le cose.
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
              <strong>Tutte le opportunità, in un solo posto</strong>
              <span>Bandi, tirocini, programmi e viaggi spesati dagli enti: li cerchiamo noi sulle fonti ufficiali, ogni mattina alle 7.</span>
            </div>
          </li>
          <li>
            <LuKeyRound aria-hidden="true" />
            <div>
              <strong>La sala riservata</strong>
              <span>Premium è gratuito e su selezione: video lezioni registrate da Andrea, cene e incontri dal vivo.</span>
            </div>
          </li>
        </ul>
      </section>

      <div className="welcome__section">
        <FounderCard />
      </div>

      {courses.data && courses.data.length > 0 && (
        <section className="welcome__section">
          <h2 className="h-section">I corsi</h2>
          <div className="doors-row">
            {courses.data.slice(0, 8).map((c) => (
              <a key={c.id} href="#/accedi?tab=registrati" className="door-card">
                <DoorCover title={c.title} level={courseLabel(c)} />
              </a>
            ))}
          </div>
          <p className="muted small">Lezioni tenute da Andrea Bonazzi. Registrati gratis per entrare.</p>
        </section>
      )}

      <footer className="welcome__footer">
        <ArchMark size={20} />
        <span>The Lobby Academy · fondata da Andrea Bonazzi</span>
        <nav className="welcome__legal" aria-label="Note legali">
          <a href="#/privacy">Privacy</a>
          <a href="#/termini">Termini</a>
        </nav>
      </footer>
    </div>
  );
}
