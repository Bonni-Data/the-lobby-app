import React from 'react';
import { Opportunity, TAG_LABEL, CATEGORY_LABEL, daysUntil } from '../lib/data';
import { ButtonLink, formatDate } from './ui';
import { LuExternalLink, LuMapPin, LuCalendar, LuLock, LuCircleCheck, LuUserCheck, LuKeyRound } from 'react-icons/lu';

export function TagChip({ tag }: { tag: Opportunity['tag'] }) {
  return <span className={`chip chip--tag chip--${tag}`}>{TAG_LABEL[tag] || tag}</span>;
}

export function deadlineLabel(o: Pick<Opportunity, 'deadline' | 'opens_on'>) {
  const opens = daysUntil(o.opens_on);
  if (opens !== null && opens > 0) return { urgent: false, text: `Apre il ${formatDate(o.opens_on)}` };
  const d = daysUntil(o.deadline);
  if (d === null) return null;
  if (d < 0) return null;
  if (d === 0) return { urgent: true, text: 'Scade oggi' };
  if (d === 1) return { urgent: true, text: 'Scade domani' };
  if (d <= 14) return { urgent: true, text: `Scade tra ${d} giorni` };
  return null;
}

export function OppCard({ o }: { o: Opportunity }) {
  const urgency = deadlineLabel(o);
  const opensLater = (daysUntil(o.opens_on) ?? 0) > 0;
  return (
    <li className={`opp-card opp-card--${o.tag}`}>
      <div className="opp-card__top">
        <TagChip tag={o.tag} />
        {urgency && <span className={`chip ${urgency.urgent ? 'chip--urgent' : ''}`}>{urgency.text}</span>}
        {o.is_new && <span className="chip chip--new">Nuova</span>}
      </div>
      <h2 className="opp-card__title">{o.title}</h2>
      {(o.organization || o.category) && (
        <p className="opp-card__org">
          {o.organization}
          {o.organization && o.category ? ' · ' : ''}
          <span className="muted">{CATEGORY_LABEL[o.category] || o.category}</span>
        </p>
      )}
      {o.summary && <p className="opp-card__sum">{o.summary}</p>}
      {(o.covered || o.requirements) && (
        <ul className="opp-card__facts">
          {o.covered && (
            <li className="is-covered"><LuCircleCheck aria-hidden="true" /> <span><em>Offerto dall'ente:</em> {o.covered}</span></li>
          )}
          {o.requirements && (
            <li><LuUserCheck aria-hidden="true" /> {o.requirements}</li>
          )}
        </ul>
      )}
      <p className="opp-card__meta">
        {o.deadline && !opensLater && (
          <span><LuCalendar aria-hidden="true" /> Scadenza {formatDate(o.deadline)}{o.deadline_note ? ` · ${o.deadline_note}` : ''}</span>
        )}
        {opensLater && o.opens_on && (
          <span><LuCalendar aria-hidden="true" /> Apre il {formatDate(o.opens_on)}</span>
        )}
        {!o.deadline && !opensLater && <span><LuCalendar aria-hidden="true" /> Candidature sempre aperte</span>}
        {o.location && (<span><LuMapPin aria-hidden="true" /> {o.location}</span>)}
      </p>
      {o.url && (
        <a className="btn btn--secondary btn--block" href={o.url} target="_blank" rel="noopener noreferrer">
          Candidati sul sito ufficiale <LuExternalLink aria-hidden="true" />
        </a>
      )}
    </li>
  );
}

export function LockedCard({ o }: { o: Opportunity }) {
  const urgency = deadlineLabel(o);
  return (
    <li className="opp-card opp-card--locked" aria-label={`Opportunità ${TAG_LABEL[o.tag]} riservata a Premium`}>
      <div className="opp-card__top">
        <TagChip tag={o.tag} />
        {urgency && <span className={`chip ${urgency.urgent ? 'chip--urgent' : ''}`}>{urgency.text}</span>}
      </div>
      <div className="locked-lines" aria-hidden="true">
        <span style={{ width: '82%' }} />
        <span style={{ width: '54%' }} />
        <span style={{ width: '92%' }} />
      </div>
      <p className="locked-note"><LuLock aria-hidden="true" /> Riservata a Premium</p>
    </li>
  );
}

export function PremiumNudge({ count }: { count: number }) {
  return (
    <aside className="nudge">
      <span className="nudge__arch" aria-hidden="true" />
      <LuKeyRound className="nudge__icon" aria-hidden="true" />
      <h2 className="nudge__title">
        {count === 1 ? 'Un’altra occasione ti aspetta.' : `Altre ${count} occasioni ti aspettano.`}
      </h2>
      <p className="nudge__text">Con Premium apri l'archivio completo, aggiornato ogni mattina. È gratuito: si entra su selezione di Andrea.</p>
      <ButtonLink to="/premium" variant="primary">Candidati a Premium</ButtonLink>
    </aside>
  );
}

/** Always-on card: national youth card, free for everyone 18-35. */
export const CGN_URL = 'https://ioapp.it/carta-giovani-nazionale';

export function YouthCardPinned() {
  return (
    <aside className="pinned" aria-label="Sempre attiva: Carta Giovani Nazionale">
      <div className="opp-card__top">
        <span className="chip chip--pinned">Sempre attiva</span>
        <span className="chip chip--free">Gratis</span>
      </div>
      <h2 className="opp-card__title">Carta Giovani Nazionale</h2>
      <p className="opp-card__org">Dipartimento per le Politiche Giovanili · app IO</p>
      <p className="opp-card__sum">
        Sconti e vantaggi riservati a chi ha tra 18 e 35 anni: trasporti, cultura, sport, viaggi e molto altro. Sotto i 31 anni
        vale anche come carta europea EYCA.
      </p>
      <ul className="opp-card__facts">
        <li><LuUserCheck aria-hidden="true" /> Dai 18 ai 35 anni, serve solo l’app IO</li>
        <li className="is-covered"><LuCircleCheck aria-hidden="true" /> <span>Si attiva subito dopo la verifica dell’età</span></li>
      </ul>
      <a className="btn btn--primary btn--block" href={CGN_URL} target="_blank" rel="noopener noreferrer">
        Richiedila sull’app IO <LuExternalLink aria-hidden="true" />
      </a>
    </aside>
  );
}
