import React, { useState } from 'react';
import { EventItem, rsvpEvent, listEvents } from '../lib/data';
import { useAuth } from '../lib/auth';
import { ButtonLink, Spinner, ErrorState, toast, useAsync } from './ui';
import { LuMapPin, LuUsers, LuCheck, LuX, LuLock, LuUtensils } from 'react-icons/lu';

function dateParts(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('it-IT', { day: 'numeric' }),
    month: d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', ''),
    weekday: d.toLocaleDateString('it-IT', { weekday: 'long' }),
    time: d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
  };
}

function rsvpError(err: any) {
  const m = String(err?.message || '');
  if (m.includes('full')) return 'Posti esauriti per questa cena.';
  if (m.includes('past_event')) return 'Questa cena è già passata.';
  if (m.includes('premium_required')) return 'Le cene sono riservate a Premium.';
  return 'Risposta non salvata. Riprova.';
}

export function DinnerCard({ e: initial }: { e: EventItem }) {
  const [e, setE] = useState(initial);
  const [busy, setBusy] = useState<'' | 'yes' | 'no'>('');
  const d = dateParts(e.starts_at);
  const left = e.seats != null ? Math.max(0, e.seats - e.yes_count) : null;
  const full = left === 0 && e.my_response !== 'yes';

  async function answer(r: 'yes' | 'no') {
    if (e.my_response === r) return;
    setBusy(r);
    try {
      const res = await rsvpEvent(e.id, r);
      setE({ ...e, my_response: res.response, yes_count: res.yes_count });
      toast(r === 'yes' ? 'Ci sei. Ti aspettiamo a tavola.' : 'Risposta salvata. Alla prossima.');
    } catch (err) {
      toast(rsvpError(err));
    } finally {
      setBusy('');
    }
  }

  return (
    <li className="dinner">
      {d && (
        <div className="dinner__date" aria-hidden="true">
          <strong>{d.day}</strong>
          <span>{d.month}</span>
        </div>
      )}
      <div className="dinner__body">
        <span className="dinner__kicker">{d ? `${d.weekday} · ore ${d.time}` : 'Data in arrivo'}</span>
        <h3 className="dinner__title">{e.title}</h3>
        {e.summary && <p className="dinner__sum">{e.summary}</p>}
        <p className="dinner__meta">
          {e.location && <span><LuMapPin aria-hidden="true" /> {e.location}</span>}
          <span><LuUsers aria-hidden="true" /> {e.yes_count} {e.yes_count === 1 ? 'presente' : 'presenti'}{left != null ? ` · ${left} ${left === 1 ? 'posto libero' : 'posti liberi'}` : ''}</span>
        </p>
        <div className="rsvp" role="group" aria-label="La tua risposta">
          <button
            className={`rsvp__btn rsvp__btn--yes ${e.my_response === 'yes' ? 'is-on' : ''}`}
            onClick={() => answer('yes')}
            disabled={!!busy || full}
            aria-pressed={e.my_response === 'yes'}
          >
            <LuCheck aria-hidden="true" /> {full ? 'Posti esauriti' : 'Presente'}
          </button>
          <button
            className={`rsvp__btn rsvp__btn--no ${e.my_response === 'no' ? 'is-on' : ''}`}
            onClick={() => answer('no')}
            disabled={!!busy}
            aria-pressed={e.my_response === 'no'}
          >
            <LuX aria-hidden="true" /> Non presente
          </button>
        </div>
      </div>
    </li>
  );
}

/** The "Cene" section of Opportunità: full list with RSVP for Premium, a locked teaser for everyone else. */
export function DinnersSection() {
  const { plan } = useAuth();
  const data = useAsync(() => listEvents('cena'), [plan.premium]);
  const items = data.data || [];

  if (!plan.premium) {
    return (
      <section className="dinners-locked">
        <span className="dinners-locked__icon" aria-hidden="true"><LuLock /></span>
        <h2 className="dinners-locked__title">Le cene della Lobby</h2>
        <p>
          Tavoli a numero chiuso con Andrea: persone, storie e percorsi che non trovi online. Gli avvisi delle cene si pubblicano
          qui e si risponde con un tocco, presente o non presente.
        </p>
        {items.length > 0 && (
          <p className="dinners-locked__count">
            {items.length === 1 ? 'C’è 1 cena in calendario.' : `Ci sono ${items.length} cene in calendario.`}
          </p>
        )}
        <ButtonLink to="/premium" variant="primary">
          {plan.application?.status === 'pending' ? 'Candidatura in valutazione' : 'Candidati a Premium'}
        </ButtonLink>
      </section>
    );
  }

  return (
    <section>
      <p className="muted">
        Tavoli a numero chiuso con Andrea. Rispondi a ogni cena: se sei presente il tuo posto è tenuto, e se cambi idea
        puoi aggiornare la risposta fino all'inizio della cena.
      </p>
      {data.loading && <Spinner />}
      {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
      {data.data && items.length === 0 && (
        <div className="center-state">
          <LuUtensils size={28} />
          <p>Nessuna cena in calendario per ora. Quando Andrea pubblica la prossima, la trovi qui.</p>
        </div>
      )}
      <ul className="dinners">
        {items.map((e) => <DinnerCard key={e.id} e={e} />)}
      </ul>
    </section>
  );
}
