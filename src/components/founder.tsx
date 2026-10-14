import React from 'react';

export const FOUNDER = {
  name: 'Andrea Bonazzi',
  initials: 'AB',
  role: 'Founder di THE LOBBY e docente dei corsi',
  quote:
    'Ho fondato THE LOBBY perché capire come funzionano le istituzioni non può essere un privilegio di pochi. Ti porto dentro, una porta alla volta.',
  bio:
    'Due volte consigliere comunale e candidato sindaco a Rozzano, ambasciatore della Lombardia per l’Anno europeo dei giovani, dieci anni di impegno civico. Formatore di professione, in THE LOBBY tiene le lezioni, sceglie le opportunità e guida la community.',
};

/** Arch-shaped portrait placeholder with initials (swap for a photo later). */
export function FounderAvatar({ size = 'm' }: { size?: 's' | 'm' | 'l' }) {
  return (
    <span className={`founder-avatar founder-avatar--${size}`} aria-hidden="true">
      {FOUNDER.initials}
    </span>
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
