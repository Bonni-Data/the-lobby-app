import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { listPremiumEvents, joinWaitlist, PremiumEvent, PREMIUM_PRICE } from '../lib/data';
import { Button, Screen, Spinner, TopBar, toast, useAsync } from '../components/ui';
import { LuCompass, LuUtensils, LuHandshake, LuGraduationCap, LuCheck, LuMapPin, LuUsers, LuCalendarClock } from 'react-icons/lu';

const PERKS = [
  { icon: <LuCompass />, title: 'Tutte le opportunità', text: 'Non solo le prime 3: la lista completa, aggiornata ogni mattina alle 7.' },
  { icon: <LuUtensils />, title: 'Le cene della Lobby', text: 'Cene a numero chiuso per conoscere persone, idee e percorsi da vicino.' },
  { icon: <LuHandshake />, title: 'Incontri con Andrea', text: 'Sessioni dal vivo e online con Andrea Bonazzi: domande vere, consigli concreti.' },
  { icon: <LuGraduationCap />, title: 'Lezioni premium', text: 'Corsi avanzati e masterclass riservate, per andare più a fondo.' },
];

const KIND: Record<PremiumEvent['kind'], string> = { cena: 'Cena', incontro: 'Incontro', lezione: 'Lezione live', evento: 'Evento' };

function when(iso?: string | null) {
  if (!iso) return 'Data in arrivo';
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' }) +
    ' · ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export default function Premium() {
  const { plan, setPlan } = useAuth();
  const events = useAsync(() => listPremiumEvents(), []);
  const [busy, setBusy] = useState(false);

  async function join() {
    setBusy(true);
    try {
      await joinWaitlist();
      setPlan({ ...plan, waitlist: true });
      toast('Posto prenotato. Ti scriviamo appena Premium apre.');
    } catch {
      toast('Non è andata. Riprova tra poco.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <TopBar />
      <section className="premium-hero">
        <span className="premium-hero__arch" aria-hidden="true" />
        <span className="premium-hero__kicker">Premium</span>
        <h1 className="premium-hero__title">La sala riservata.</h1>
        <p className="premium-hero__sub">Per chi ha deciso di investire su di sé.</p>
        <p className="premium-hero__price">
          <strong>{PREMIUM_PRICE}</strong> <span>al mese</span>
        </p>
        {plan.premium ? (
          <p className="premium-hero__status"><LuCheck aria-hidden="true" /> Sei dentro. Benvenuto nella sala riservata.</p>
        ) : plan.waitlist ? (
          <p className="premium-hero__status">
            <LuCheck aria-hidden="true" />
            <span>Posto prenotato a {PREMIUM_PRICE} al mese. Ti scriviamo appena Premium apre e decidi tu se attivarlo.</span>
          </p>
        ) : (
          <div className="premium-hero__cta">
            <Button onClick={join} loading={busy} block>Prenota il tuo posto</Button>
            <p className="premium-hero__note">
              Premium apre a breve a {PREMIUM_PRICE} al mese, disdici quando vuoi. Oggi prenoti soltanto: nessun pagamento adesso, ti scriviamo all'apertura.
            </p>
          </div>
        )}
      </section>

      <main className="page">
        <h2 className="h-section">Cosa trovi dentro</h2>
        <ul className="perks">
          {PERKS.map((p) => (
            <li key={p.title}>
              <span className="perks__icon" aria-hidden="true">{p.icon}</span>
              <div>
                <strong>{p.title}</strong>
                <span>{p.text}</span>
              </div>
            </li>
          ))}
        </ul>

        <section className="block">
          <h2 className="h-section">Prossimi appuntamenti</h2>
          {events.loading && <Spinner />}
          {events.data && events.data.length === 0 && (
            <p className="muted">Il calendario di cene e incontri si apre con il lancio di Premium. Gli iscritti in lista lo vedono per primi.</p>
          )}
          {events.error && <p className="muted">Calendario non disponibile in questo momento.</p>}
          {events.data && events.data.length > 0 && (
            <ul className="events">
              {events.data.map((e) => (
                <li key={e.id} className={`event event--${e.kind}`}>
                  <span className="event__kind">{KIND[e.kind]}</span>
                  <strong className="event__title">{e.title}</strong>
                  {e.summary && <p className="event__sum">{e.summary}</p>}
                  <p className="event__meta">
                    <span><LuCalendarClock aria-hidden="true" /> {when(e.starts_at)}</span>
                    {e.location && <span><LuMapPin aria-hidden="true" /> {e.location}</span>}
                    {e.seats && <span><LuUsers aria-hidden="true" /> {e.seats} posti</span>}
                  </p>
                  {!plan.premium && <span className="event__lock">Per abbonati Premium</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </Screen>
  );
}
