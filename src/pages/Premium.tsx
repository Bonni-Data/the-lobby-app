import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { listPremiumEvents, joinWaitlist, PremiumEvent, PREMIUM_PRICE } from '../lib/data';
import { Button, Screen, Spinner, TopBar, toast, useAsync } from '../components/ui';
import { FounderCard } from '../components/founder';
import {
  LuCompass, LuUtensils, LuHandshake, LuGraduationCap, LuCheck, LuMinus, LuMapPin, LuUsers, LuCalendarClock, LuPlane, LuBriefcase, LuSprout, LuChevronDown,
} from 'react-icons/lu';

const PER_DAY = '43 centesimi';

const FEATURES = [
  {
    n: '01',
    icon: <LuCompass />,
    kicker: 'Ogni mattina alle 7',
    title: 'Tutte le opportunità. Non solo 3.',
    text: 'Le opportunità pubbliche sono sparse su decine di siti. Noi le cerchiamo ogni giorno sulle fonti ufficiali e le mettiamo in un unico archivio: chi è free ne vede tre, tu le vedi tutte. Arrivi prima, scegli meglio.',
    tags: [
      { icon: <LuPlane />, label: 'Viaggi spesati dagli enti verso eventi ONU e UE' },
      { icon: <LuBriefcase />, label: 'Tirocini retribuiti nelle istituzioni' },
      { icon: <LuSprout />, label: 'Programmi e fondi per crescere' },
    ],
  },
  {
    n: '02',
    icon: <LuUtensils />,
    kicker: 'A numero chiuso',
    title: 'Le cene della Lobby.',
    text: 'Pochi posti, un tavolo, Andrea a fare gli onori di casa. Persone, storie e percorsi che non trovi in nessun feed, e contatti che restano.',
  },
  {
    n: '03',
    icon: <LuHandshake />,
    kicker: 'Dal vivo e online',
    title: 'Faccia a faccia con Andrea.',
    text: 'Il founder di THE LOBBY, senza filtri. Domande dirette, risposte vere: cosa studiare, a quale porta bussare, come prepararti a un bando o a un colloquio nelle istituzioni.',
  },
  {
    n: '04',
    icon: <LuGraduationCap />,
    kicker: 'Per andare a fondo',
    title: 'Lezioni premium.',
    text: 'Masterclass e corsi avanzati tenuti da Andrea per andare oltre le basi: bandi europei, lavoro nelle istituzioni, comunicazione pubblica.',
  },
];

const COMPARE: { label: string; free: string | boolean; premium: string | boolean }[] = [
  { label: 'Corsi base e quiz', free: true, premium: true },
  { label: 'Archivio opportunità, aggiornato ogni mattina', free: 'Le prime 3', premium: 'Tutte' },
  { label: 'Lezioni premium e masterclass', free: false, premium: true },
  { label: 'Cene della Lobby', free: false, premium: true },
  { label: 'Incontri con Andrea', free: false, premium: true },
];

const FAQ = [
  { q: 'Devo pagare adesso?', a: 'No. Oggi prenoti soltanto il tuo posto. Quando Premium apre ti scriviamo e decidi tu se attivarlo.' },
  { q: 'Quanto costa?', a: `${PREMIUM_PRICE} al mese, circa ${PER_DAY} al giorno. Disdici quando vuoi.` },
  { q: 'Cosa si sblocca quando attivo?', a: 'Tutto, subito: l’archivio completo delle opportunità, le lezioni premium, le cene e gli incontri in calendario.' },
  { q: 'Chi paga i viaggi delle opportunità?', a: 'Gli enti che le pubblicano, quando il bando lo prevede. THE LOBBY non organizza né finanzia le opportunità: le cerca, le verifica sulle fonti ufficiali e te le mette tutte in un solo posto. Ti candidi direttamente sul sito dell’ente.' },
  { q: 'Perché prenotare ora?', a: 'Chi è in lista viene avvisato per primo, prima che Premium apra a tutti.' },
];

const KIND: Record<PremiumEvent['kind'], string> = { cena: 'Cena', incontro: 'Incontro', lezione: 'Lezione live', evento: 'Evento' };

function when(iso?: string | null) {
  if (!iso) return 'Data in arrivo';
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' }) +
    ' · ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <LuCheck className="cmp__yes" aria-label="Incluso" />;
  if (v === false) return <LuMinus className="cmp__no" aria-label="Non incluso" />;
  return <span>{v}</span>;
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

  const cta = (where: string) =>
    plan.premium ? (
      <p className="premium-status"><LuCheck aria-hidden="true" /><span>Sei dentro. Benvenuto nella sala riservata.</span></p>
    ) : plan.waitlist ? (
      <p className="premium-status">
        <LuCheck aria-hidden="true" />
        <span>Posto prenotato a {PREMIUM_PRICE} al mese. Ti scriviamo appena Premium apre e decidi tu se attivarlo.</span>
      </p>
    ) : (
      <div className="premium-cta" data-where={where}>
        <Button onClick={join} loading={busy} block>Prenota il tuo posto</Button>
        <p className="premium-cta__note">Oggi prenoti soltanto: nessun pagamento adesso. Ti scriviamo all'apertura.</p>
      </div>
    );

  return (
    <Screen>
      <TopBar />
      <section className="premium-hero">
        <span className="premium-hero__arch" aria-hidden="true" />
        <span className="premium-hero__kicker">Premium</span>
        <h1 className="premium-hero__title">La sala riservata.</h1>
        <p className="premium-hero__sub">Le porte che contano non si aprono da sole. Questa sì.</p>
        <p className="premium-hero__price">
          <strong>{PREMIUM_PRICE}</strong> <span>al mese<br />circa {PER_DAY} al giorno</span>
        </p>
        {cta('top')}
      </section>

      <main className="page">
        <p className="premium-intro">
          Hai scelto di non restare a guardare. Premium è dove quella scelta diventa esperienza: più occasioni, più persone giuste, più strumenti per contare.
        </p>

        <ol className="features">
          {FEATURES.map((f) => (
            <li key={f.n} className="feature">
              <div className="feature__head">
                <span className="feature__n">{f.n}</span>
                <span className="feature__icon" aria-hidden="true">{f.icon}</span>
              </div>
              <span className="feature__kicker">{f.kicker}</span>
              <h2 className="feature__title">{f.title}</h2>
              <p className="feature__text">{f.text}</p>
              {f.tags && (
                <ul className="feature__tags">
                  {f.tags.map((t) => (
                    <li key={t.label}><span aria-hidden="true">{t.icon}</span>{t.label}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>

        <FounderCard title="Dall'altra parte del tavolo" />

        <section className="block">
          <h2 className="h-section">Free o Premium</h2>
          <table className="cmp">
            <thead>
              <tr><th scope="col"><span className="sr-only">Cosa</span></th><th scope="col">Free</th><th scope="col" className="cmp__pro">Premium</th></tr>
            </thead>
            <tbody>
              {COMPARE.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  <td><Cell v={r.free} /></td>
                  <td className="cmp__pro"><Cell v={r.premium} /></td>
                </tr>
              ))}
              <tr className="cmp__price">
                <th scope="row">Prezzo</th>
                <td>Gratis</td>
                <td className="cmp__pro">{PREMIUM_PRICE}<small>/mese</small></td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="premium-close">
          <span className="premium-close__arch" aria-hidden="true" />
          <h2 className="premium-close__title">Non guardare la politica da fuori. Entra.</h2>
          <p className="premium-close__sign">Andrea Bonazzi, founder di THE LOBBY</p>
          <p className="premium-close__price"><strong>{PREMIUM_PRICE}</strong> al mese · disdici quando vuoi</p>
          {cta('bottom')}
        </section>

        <section className="block">
          <h2 className="h-section">Domande veloci</h2>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}<LuChevronDown aria-hidden="true" /></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="block">
          <h2 className="h-section">Prossimi appuntamenti</h2>
          {events.loading && <Spinner />}
          {events.data && events.data.length === 0 && (
            <p className="muted">Il calendario di cene e incontri si apre con il lancio di Premium. Chi è in lista lo vede per primo.</p>
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
