import React from 'react';
import { Link } from '../lib/router';

export const PHOTO_FACE = './img/andrea-face.webp';
export const PHOTO_CUT = './img/andrea-cut.webp';

export const FOUNDER = {
  name: 'Andrea Bonazzi',
  initials: 'AB',
  role: 'Founder di THE LOBBY e docente dei corsi',
  quote:
    'Ho fondato THE LOBBY perché capire come funzionano le istituzioni non può essere un privilegio di pochi. Ti porto dentro, una porta alla volta.',
  bio:
    'Due volte consigliere comunale e candidato sindaco a Rozzano, ambasciatore della Lombardia per l’Anno europeo dei giovani, dieci anni di impegno civico. Di professione è formatore in un grande gruppo bancario internazionale. In THE LOBBY tiene le lezioni, sceglie le opportunità e guida la community.',
};

/** Arch-shaped portrait of Andrea. */
export function FounderAvatar({ size = 'm' }: { size?: 's' | 'm' | 'l' }) {
  return (
    <span className={`founder-avatar founder-avatar--${size}`} aria-hidden="true">
      <img src={PHOTO_FACE} alt="" loading="lazy" decoding="async" />
    </span>
  );
}

/** Home box: who Andrea is, with a link to the full story. */
export function FounderBox() {
  return (
    <Link to="/andrea" className="founder-box" aria-label="Chi è Andrea Bonazzi: leggi la sua storia">
      <div className="founder-box__text">
        <span className="founder-box__kicker">Il tuo docente</span>
        <strong className="founder-box__name">Andrea Bonazzi</strong>
        <span className="founder-box__line">
          Due volte consigliere comunale, candidato sindaco, ambasciatore europeo dei giovani. Dieci anni dentro le istituzioni.
        </span>
        <span className="founder-box__go">Scopri la sua storia →</span>
      </div>
      <div className="founder-box__photo" aria-hidden="true">
        <span className="founder-box__arch" />
        <img src={PHOTO_CUT} alt="" loading="lazy" decoding="async" />
      </div>
    </Link>
  );
}

/** Small "con Andrea Bonazzi" teacher line for courses and lessons. */
export function TeacherLine({ tone = 'navy', label = 'docente' }: { tone?: 'navy' | 'ivory'; label?: string }) {
  return (
    <p className={`teacher teacher--${tone}`}>
      <FounderAvatar size="s" />
      <span>
        Con <strong>{FOUNDER.name}</strong> · {label}
      </span>
    </p>
  );
}

/** Full founder block: portrait, name, role, personal quote, short bio. */
export function FounderCard({ title = 'Chi ti apre la porta', dark = false }: { title?: string; dark?: boolean }) {
  return (
    <section className={`founder ${dark ? 'founder--dark' : ''}`}>
      <span className="founder__kicker">{title}</span>
      <div className="founder__id">
        <FounderAvatar size="l" />
        <div>
          <strong className="founder__name">{FOUNDER.name}</strong>
          <span className="founder__role">{FOUNDER.role}</span>
        </div>
      </div>
      <blockquote className="founder__quote">
        <p>“{FOUNDER.quote}”</p>
      </blockquote>
      <p className="founder__bio">{FOUNDER.bio}</p>
      <a href="#/andrea" className="founder__more">Leggi la sua storia →</a>
    </section>
  );
}
