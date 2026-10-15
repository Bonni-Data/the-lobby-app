import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { listEvents, listCourses, listLive, isLive, liveIsOver, submitApplication, EventItem } from '../lib/data';
import { Button, Screen, Spinner, TopBar, toast, useAsync, formatDate } from '../components/ui';
import { FounderAvatar } from '../components/founder';
import { MeetingSection } from '../components/meeting';
import { CONTACT_EMAIL } from '../config';
import { Link } from '../lib/router';
import {
  LuCompass, LuUtensils, LuHandshake, LuGraduationCap, LuCheck, LuMinus, LuMapPin, LuUsers, LuCalendarClock, LuPlane, LuBriefcase,
  LuSprout, LuChevronDown, LuPenLine, LuEye, LuDoorOpen, LuHourglass, LuArrowRight, LuLock, LuRadio,
} from 'react-icons/lu';

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
    link: { to: '/opportunita', label: 'Apri l’archivio completo' },
  },
  {
    n: '02',
    icon: <LuUtensils />,
    kicker: 'A numero chiuso',
    title: 'Le cene della Lobby.',
    text: 'Pochi posti, un tavolo, Andrea a fare gli onori di casa. Persone, storie e percorsi che non trovi in nessun feed, e contatti che restano.',
    link: { to: '/opportunita?sezione=cene', label: 'Vai alle cene e rispondi presente' },
  },
  {
    n: '03',
    icon: <LuHandshake />,
    kicker: 'Dal vivo e online',
    title: 'Faccia a faccia con Andrea.',
    text: 'Il founder di THE LOBBY, senza filtri. Prenoti 5, 15 o 30 minuti con lui per rivedere un testo, fare domande dirette o chiedere un consiglio: cosa studiare, a quale porta bussare, come prepararti a un bando o a un colloquio nelle istituzioni.',
    link: { to: '#incontro', label: 'Prenota un incontro' },
  },
  {
    n: '04',
    icon: <LuGraduationCap />,
    kicker: 'Live su Teams con Andrea',
    title: 'Le masterclass, dal vivo.',
    text: 'I corsi più avanzati li tiene Andrea in diretta su Microsoft Teams: dietro le quinte delle istituzioni, public speaking avanzato, networking e stakeholder, come farsi strada in un partito, come candidarsi. Prenoti il posto e ricevi data e link per entrare. In più, corsi Premium da leggere con quiz: executive presence, bandi europei, entrare nelle istituzioni, lobbying.',
    link: { to: '/academy?sezione=premium', label: 'Vai ai corsi Premium' },
  },
];

const STEPS = [
  { icon: <LuPenLine />, title: 'Raccontati', text: 'Chi sei, cosa hai fatto finora, dove vuoi arrivare. Bastano cinque minuti e un po’ di sincerità.' },
  { icon: <LuEye />, title: 'Andrea valuta il tuo percorso', text: 'Legge personalmente ogni candidatura: da dove parti, cosa hai già costruito, quanto sei pronto per il prossimo livello.' },
  { icon: <LuDoorOpen />, title: 'La porta si apre', text: 'Se sei pronto, attiva il tuo accesso Premium. Gratis. Se non ancora, ricevi un riscontro e potrai ricandidarti.' },
];

const COMPARE: { label: string; free: string | boolean; premium: string | boolean }[] = [
  { label: 'Corsi base e quiz', free: true, premium: true },
  { label: 'Archivio opportunità, aggiornato ogni mattina', free: 'Le prime 3', premium: 'Tutte' },
  { label: 'Lezioni live su Teams con Andrea', free: false, premium: true },
  { label: 'Corsi avanzati con quiz', free: false, premium: true },
  { label: 'Cene della Lobby', free: false, premium: true },
  { label: 'Incontri con Andrea', free: false, premium: true },
];

const FAQ = [
  { q: 'Quanto costa?', a: 'Niente. Premium è gratuito: non si compra, si entra su selezione.' },
  { q: 'Chi decide?', a: 'Andrea Bonazzi, founder di THE LOBBY. Legge personalmente ogni candidatura e decide chi è pronto per entrare.' },
  { q: 'Cosa conta nella valutazione?', a: 'Motivazione, concretezza e voglia di crescere. Non serve un curriculum perfetto: racconta cosa hai fatto davvero, anche se ti sembra piccolo, e dove vuoi arrivare.' },
  { q: 'Come sono fatte le lezioni Premium?', a: 'In due modi. I corsi da leggere sono come quelli gratuiti, ma più avanzati, con quiz alla fine di ogni lezione. Le lezioni live le tiene Andrea in diretta su Microsoft Teams: prenoti il posto dalla pagina del corso e, quando Andrea fissa la data, la trovi lì insieme al link per entrare, e ti arriva anche per email.' },
  { q: 'Quando parte una lezione live?', a: 'Andrea apre un’edizione alla volta e fissa la data quando il gruppo è pronto. Chi è iscritto trova nel corso giorno, ora e il link per entrare su Teams, e riceve tutto per email.' },
  { q: 'Come funzionano gli incontri con Andrea?', a: 'Chi è in Premium può chiedere 5, 15 o 30 minuti con Andrea, in videochiamata, al telefono o di persona: per rivedere un testo, fare domande o chiedere un consiglio. Compili il modulo in questa pagina e Andrea ti scrive per fissare giorno e ora. Puoi chiederne fino a 3 al mese.' },
  { q: 'Dove ricevo la risposta?', a: 'Qui nell’app, in questa pagina. Se Premium viene attivato, si sblocca tutto subito.' },
  { q: 'E se non vengo selezionato?', a: 'Ricevi un riscontro e puoi ricandidarti dopo 30 giorni, quando il tuo percorso sarà cresciuto.' },
  { q: 'Chi paga i viaggi delle opportunità?', a: 'Gli enti che le pubblicano, quando il bando lo prevede. THE LOBBY non organizza né finanzia le opportunità: le cerca, le verifica sulle fonti ufficiali e te le mette tutte in un solo posto. Ti candidi direttamente sul sito dell’ente.' },
];

const KIND: Record<EventItem['kind'], string> = { cena: 'Cena', incontro: 'Incontro', lezione: 'Lezione live', evento: 'Evento' };
const MIN = 30;
const MAX = 2000;

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

function friendly(err: any) {
  const m = String(err?.message || '');
  if (m.includes('too_short')) return `Scrivi qualche riga in più per ogni domanda (almeno ${MIN} caratteri).`;
  if (m.includes('too_long')) return `Ogni risposta può avere al massimo ${MAX} caratteri.`;
  if (m.includes('bad_link')) return 'Il link deve iniziare con https://';
  if (m.includes('already_pending')) return 'Hai già una candidatura in valutazione.';
  if (m.includes('retry_later')) return 'Potrai ricandidarti 30 giorni dopo l’ultima risposta.';
  if (m.includes('already_premium')) return 'Sei già dentro Premium.';
  return 'Invio non riuscito. Controlla la connessione e riprova.';
}

type Field = 'about' | 'experience' | 'goal';
const QUESTIONS: { key: Field; label: string; hint: string; placeholder: string }[] = [
  {
    key: 'about',
    label: 'Chi sei oggi',
    hint: 'Studio, lavoro, città, cosa ti appassiona.',
    placeholder: 'Es. Ho 22 anni, studio Scienze politiche a Milano e seguo da vicino la vita del mio Comune.',
  },
  {
    key: 'experience',
    label: 'Cosa hai fatto finora',
    hint: 'Esperienze di studio, lavoro, volontariato, associazioni, rappresentanza, progetti personali.',
    placeholder: 'Racconta i fatti: cosa hai fatto, con chi, cosa hai imparato.',
  },
  {
    key: 'goal',
    label: 'Il tuo prossimo livello',
    hint: 'Dove vuoi arrivare nei prossimi 12 mesi e perché Premium ti serve adesso.',
    placeholder: 'Es. Voglio candidarmi a un tirocinio nelle istituzioni europee e costruire la mia rete.',
  },
];

function ApplicationForm({ onDone }: { onDone: () => void }) {
  const [values, setValues] = useState<Record<Field, string>>({ about: '', experience: '', goal: '' });
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (QUESTIONS.some((q) => values[q.key].trim().length < MIN)) {
      return setError(`Scrivi qualche riga in più per ogni domanda (almeno ${MIN} caratteri).`);
    }
    if (link.trim() && !/^https?:\/\//i.test(link.trim())) return setError('Il link deve iniziare con https://');
    setBusy(true);
    try {
      await submitApplication({ about: values.about, experience: values.experience, goal: values.goal, link: link.trim() });
      toast('Candidatura inviata. Andrea la leggerà personalmente.');
      onDone();
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="apply" onSubmit={send} noValidate>
      {QUESTIONS.map((q, i) => (
        <label key={q.key} className="apply__field">
          <span className="apply__label"><em>{String(i + 1).padStart(2, '0')}</em> {q.label}</span>
          <span className="apply__hint">{q.hint}</span>
          <textarea
            value={values[q.key]}
            onChange={(e) => setValues({ ...values, [q.key]: e.target.value.slice(0, MAX) })}
            placeholder={q.placeholder}
            rows={4}
          />
          <span className={`apply__count ${values[q.key].trim().length >= MIN ? 'is-ok' : ''}`}>
            {values[q.key].trim().length < MIN ? `Ancora ${MIN - values[q.key].trim().length} caratteri` : <><LuCheck aria-hidden="true" /> Ok</>}
          </span>
        </label>
      ))}
      <label className="apply__field">
        <span className="apply__label"><em>04</em> Un link che parla di te <small>(facoltativo)</small></span>
        <input type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://linkedin.com/in/..." />
      </label>
      {error && <div className="alert" role="alert">{error}</div>}
      <Button type="submit" block loading={busy}>Invia la candidatura</Button>
      <p className="apply__note">
        La candidatura arriva ad Andrea, anche via email a {CONTACT_EMAIL}, e la risposta ti arriva qui e per email. Usiamo i tuoi testi solo per valutarla: leggi
        l’<Link to="/privacy">Informativa privacy</Link>.
      </p>
    </form>
  );
}

export default function Premium() {
  const { plan, refreshPlan } = useAuth();
  const events = useAsync(() => listEvents(), [plan.premium]);
  const lives = useAsync(async () => {
    const [courses, live] = await Promise.all([listCourses(), listLive()]);
    return courses.filter(isLive).map((c) => ({ c, e: live.find((x) => x.course_id === c.id) }));
  }, [plan.premium]);
  const app = plan.application;
  const retryAfter = app?.status === 'rejected' && app.retry_after ? new Date(app.retry_after) : null;
  const state: 'in' | 'pending' | 'wait' | 'apply' = plan.premium
    ? 'in'
    : app?.status === 'pending'
      ? 'pending'
      : retryAfter && retryAfter.getTime() > Date.now()
        ? 'wait'
        : 'apply';

  const goToForm = () => document.getElementById('candidatura')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const status = (where: string) => {
    if (state === 'in') return <p className="premium-status" data-where={where}><LuCheck aria-hidden="true" /><span>Sei dentro. La porta è aperta: tutto Premium è sbloccato.</span></p>;
    if (state === 'pending')
      return (
        <p className="premium-status" data-where={where}>
          <LuHourglass aria-hidden="true" />
          <span>Candidatura inviata il {formatDate(app!.created_at)}. Andrea la sta valutando: la risposta arriva qui.</span>
        </p>
      );
    if (state === 'wait')
      return (
        <div className="premium-status premium-status--col" data-where={where}>
          <span><strong>Non ancora.</strong> Puoi ricandidarti dal {formatDate(app!.retry_after)}.</span>
          {app?.reviewer_note && <span className="premium-status__note">“{app.reviewer_note}” — Andrea</span>}
        </div>
      );
    return (
      <div className="premium-cta" data-where={where}>
        <Button onClick={goToForm} block>Candidati a Premium</Button>
        <p className="premium-cta__note">Gratuito. Accesso su selezione, valutato personalmente da Andrea Bonazzi.</p>
      </div>
    );
  };

  return (
    <Screen>
      <TopBar />
      <section className="premium-hero">
        <span className="premium-hero__arch" aria-hidden="true" />
        <span className="premium-hero__kicker">Premium · su selezione</span>
        <h1 className="premium-hero__title">La sala riservata.</h1>
        <p className="premium-hero__sub">Non si compra. Si conquista.</p>
        <ul className="premium-badges">
          <li>Gratuito</li>
          <li>Su selezione</li>
          <li>Lezioni live con Andrea</li>
        </ul>
        {status('top')}
      </section>

      <main className="page">
        <section className="letter">
          <div className="letter__head">
            <FounderAvatar size="m" />
            <div>
              <strong>Andrea Bonazzi</strong>
              <span>Founder e docente di THE LOBBY · <a href="#/andrea">la sua storia</a></span>
            </div>
          </div>
          <p>
            “Premium è gratuito, ma non è per tutti. Ogni candidatura la leggo io, una per una: guardo da dove parti, cosa hai
            già costruito e dove vuoi arrivare. Non cerco curriculum perfetti. Cerco persone pronte a fare il prossimo passo.
            Se lo sei, ti apro la porta.”
          </p>
        </section>

        <h2 className="h-section">Cosa trovi dentro</h2>
        <ol className="features">
          {FEATURES.map((f) => (
            <li key={f.n} className="feature">
              <div className="feature__head">
                <span className="feature__n">{f.n}</span>
                <span className="feature__icon" aria-hidden="true">{f.icon}</span>
              </div>
              <span className="feature__kicker">{f.kicker}</span>
              <h3 className="feature__title">{f.title}</h3>
              <p className="feature__text">{f.text}</p>
              {f.tags && (
                <ul className="feature__tags">
                  {f.tags.map((t) => (
                    <li key={t.label}><span aria-hidden="true">{t.icon}</span>{t.label}</li>
                  ))}
                </ul>
              )}
              {f.link && (
                plan.premium || plan.admin ? (
                  f.link.to.startsWith('#') ? (
                    <button className="feature__link" onClick={() => document.getElementById(f.link!.to.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                      {f.link.label} <LuArrowRight aria-hidden="true" />
                    </button>
                  ) : (
                    <Link to={f.link.to} className="feature__link">{f.link.label} <LuArrowRight aria-hidden="true" /></Link>
                  )
                ) : (
                  <span className="feature__lock"><LuLock aria-hidden="true" /> Si sblocca entrando in Premium</span>
                )
              )}
            </li>
          ))}
        </ol>

        {(plan.premium || plan.admin) && <MeetingSection />}

        <section className="block">
          <h2 className="h-section">Come si entra</h2>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="steps__n" aria-hidden="true">{s.icon}</span>
                <div>
                  <strong>{i + 1}. {s.title}</strong>
                  <span>{s.text}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="block" id="candidatura">
          <h2 className="h-section">La tua candidatura</h2>
          {state === 'apply' ? (
            <>
              <p className="muted">Scrivi come parleresti ad Andrea. Sii concreto: contano i fatti e la direzione, non i titoli.</p>
              <ApplicationForm onDone={refreshPlan} />
            </>
          ) : (
            <div className="apply-status">{status('form')}</div>
          )}
        </section>

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
                <th scope="row">Accesso</th>
                <td>Libero</td>
                <td className="cmp__pro">Su selezione<small> · gratis</small></td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="premium-close">
          <span className="premium-close__arch" aria-hidden="true" />
          <h2 className="premium-close__title">Non guardare la politica da fuori. Entra.</h2>
          <p className="premium-close__sign">Andrea Bonazzi, founder di THE LOBBY</p>
          {status('bottom')}
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

        <section className="block" id="live">
          <h2 className="h-section">Lezioni live con Andrea</h2>
          <p className="muted">Su Microsoft Teams, dal vivo con Andrea. Prenoti il posto e ricevi data e link per entrare.</p>
          {lives.loading && <Spinner />}
          {lives.data && (
            <ul className="live-strip">
              {lives.data.map(({ c, e }) => (
                <li key={c.id}>
                  <Link to={`/corso/${c.slug}`} className="live-strip__item">
                    <span className="live-strip__icon" aria-hidden="true">{plan.premium ? <LuRadio /> : <LuLock />}</span>
                    <span className="live-strip__body">
                      <strong>{c.title}</strong>
                      <span>
                        {e?.starts_at && !liveIsOver(e) ? `In calendario: ${when(e.starts_at)}` : e ? 'Prenotazioni aperte' : 'Prossima edizione in arrivo'}
                      </span>
                    </span>
                    <LuArrowRight aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="block">
          <h2 className="h-section">Prossimi appuntamenti</h2>
          {events.loading && <Spinner />}
          {events.data && events.data.length === 0 && (
            <p className="muted">Il calendario di cene e incontri è in preparazione. Chi entra in Premium lo vede per primo.</p>
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
                  {!plan.premium && <span className="event__lock">Per chi è in Premium</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </Screen>
  );
}
