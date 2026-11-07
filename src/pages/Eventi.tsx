import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { listCourses, listLive, isLive, liveIsOver, submitApplication, saveDisplayName, isFullName } from '../lib/data';
import { Button, Screen, Spinner, TopBar, toast, useAsync, formatDate } from '../components/ui';
import { FounderAvatar } from '../components/founder';
import { DinnersSection } from '../components/dinners';
import { CONTACT_EMAIL } from '../config';
import { Link } from '../lib/router';
import {
  LuUtensils, LuGraduationCap, LuCheck, LuMinus, LuChevronDown, LuPenLine, LuEye, LuDoorOpen, LuHourglass, LuArrowRight, LuLock, LuRadio,
} from 'react-icons/lu';

// 7/11/2026, decisione di Andrea: la voce «Premium» diventa «Eventi». Dentro ci sono le cene di networking e le lezioni live
// su Teams con lui (prima erano Premium); l'accesso resta gratuito e su selezione, con la candidatura che legge lui.
// Tutto il resto è aperto a tutti (percorso, opportunità, incontri online con Andrea dalla pagina «Chi è Andrea?»).
// Nel database e nel codice i nomi restano quelli di prima (plan.premium, premium_events, access_level 'premium').

const STEPS = [
  { icon: <LuPenLine />, title: 'Raccontati', text: 'Chi sei, cosa hai fatto finora, dove vuoi arrivare. Bastano cinque minuti e un po’ di sincerità.' },
  { icon: <LuEye />, title: 'Andrea legge il tuo percorso', text: 'Legge personalmente ogni candidatura: da dove parti, cosa hai già costruito, quanto sei pronto per il prossimo livello.' },
  { icon: <LuDoorOpen />, title: 'La porta si apre', text: 'Se sei pronto, ti apre l’accesso agli eventi. Gratis. Se non ancora, ricevi un riscontro e potrai ricandidarti.' },
];

const COMPARE: { label: string; free: boolean; events: boolean }[] = [
  { label: 'Tutto il percorso, con quiz, simulazioni e attestati', free: true, events: true },
  { label: 'Tutte le opportunità, ogni mattina', free: true, events: true },
  { label: 'Incontri online con Andrea', free: true, events: true },
  { label: 'Lezioni live su Teams con Andrea', free: false, events: true },
  { label: 'Cene di networking', free: false, events: true },
];

const FAQ = [
  { q: 'Quanto costano gli eventi?', a: 'Niente. L’accesso agli eventi è gratuito: non si compra, si entra su selezione. Alle cene ognuno paga la propria cena.' },
  { q: 'Chi decide?', a: 'Andrea Bonazzi, founder di THE LOBBY. Legge personalmente ogni candidatura e decide chi è pronto per partecipare.' },
  { q: 'Cosa conta nella valutazione?', a: 'Motivazione, concretezza e voglia di crescere. Non serve un curriculum perfetto: racconta cosa hai fatto davvero, anche se ti sembra piccolo, e dove vuoi arrivare.' },
  { q: 'Cosa resta gratis per tutti?', a: 'Tutto il percorso dell’Academy, con quiz, simulazioni e attestati, tutte le opportunità e gli incontri online con Andrea. Gli eventi sono le due cose che si fanno dal vivo: le lezioni live su Teams con Andrea e le cene di networking.' },
  { q: 'Come sono fatte le lezioni live?', a: 'Le tiene Andrea in diretta su Microsoft Teams, in gruppi piccoli. Prenoti il posto dalla pagina del corso e, quando Andrea fissa la data, la trovi lì insieme al link per entrare, e ti arriva anche per email.' },
  { q: 'Come funzionano le cene?', a: 'Sono tavoli a numero chiuso con Andrea, solo per maggiorenni. Quando esce una cena la trovi in questa pagina e rispondi presente o non presente con un tocco. Il locale arriva a chi conferma.' },
  { q: 'E gli incontri con Andrea?', a: 'Sono aperti a tutti, anche senza accesso agli eventi: con l’email confermata chiedi 5, 15 o 30 minuti in videochiamata o al telefono dalla pagina «Chi è Andrea?», per rivedere un testo, fare domande o chiedere un consiglio. Andrea ti scrive per fissare giorno e ora. Puoi chiederne fino a 3 al mese.' },
  { q: 'Dove ricevo la risposta?', a: 'Qui nell’app, in questa pagina, e per email. Se l’accesso viene attivato, si sblocca tutto subito.' },
  { q: 'E se non vengo selezionato?', a: 'Ricevi un riscontro e puoi ricandidarti dopo 30 giorni, quando il tuo percorso sarà cresciuto.' },
  { q: 'Chi paga i viaggi delle opportunità?', a: 'Gli enti che le pubblicano, quando il bando lo prevede. THE LOBBY non organizza né finanzia le opportunità: le cerca, le verifica sulle fonti ufficiali e te le mette tutte in un solo posto. Ti candidi direttamente sul sito dell’ente.' },
];

const MIN = 30;
const MAX = 2000;

function when(iso?: string | null) {
  if (!iso) return 'Data in arrivo';
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' }) +
    ' · ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function Cell({ v }: { v: boolean }) {
  return v ? <LuCheck className="cmp__yes" aria-label="Incluso" /> : <LuMinus className="cmp__no" aria-label="Non incluso" />;
}

function friendly(err: any) {
  const m = String(err?.message || '');
  if (m.includes('too_short')) return `Scrivi qualche riga in più per ogni domanda (almeno ${MIN} caratteri).`;
  if (m.includes('too_long')) return `Ogni risposta può avere al massimo ${MAX} caratteri.`;
  if (m.includes('bad_link')) return 'Il link deve iniziare con https://';
  if (m.includes('already_pending')) return 'Hai già una candidatura in valutazione.';
  if (m.includes('retry_later')) return 'Potrai ricandidarti 30 giorni dopo l’ultima risposta.';
  if (m.includes('already_premium')) return 'Hai già l’accesso agli eventi.';
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
    hint: 'Dove vuoi arrivare nei prossimi 12 mesi e perché gli eventi ti servono adesso.',
    placeholder: 'Es. Voglio candidarmi a un tirocinio nelle istituzioni europee e costruire la mia rete.',
  },
];

function ApplicationForm({ onDone }: { onDone: () => void }) {
  const { displayName, setDisplayName } = useAuth();
  const [fullName, setFullName] = useState(displayName);
  const [values, setValues] = useState<Record<Field, string>>({ about: '', experience: '', goal: '' });
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const full = fullName.trim().replace(/\s+/g, ' ');
    if (!isFullName(full)) return setError('Scrivi nome e cognome: Andrea li vede nella candidatura.');
    if (QUESTIONS.some((q) => values[q.key].trim().length < MIN)) {
      return setError(`Scrivi qualche riga in più per ogni domanda (almeno ${MIN} caratteri).`);
    }
    if (link.trim() && !/^https?:\/\//i.test(link.trim())) return setError('Il link deve iniziare con https://');
    setBusy(true);
    try {
      // The application takes the name from the profile: save the full name there first.
      if (full !== displayName) {
        await saveDisplayName(full);
        setDisplayName(full);
      }
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
      <label className="apply__field">
        <span className="apply__label">Nome e cognome</span>
        <input value={fullName} onChange={(e) => setFullName(e.target.value.slice(0, 80))} autoComplete="name" autoCapitalize="words" placeholder="es. Rebecca Rossi" />
      </label>
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
        <span className="apply__hint">Per esempio il tuo profilo LinkedIn, ma va bene anche un sito, un portfolio, un articolo o un progetto.</span>
        <input type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Es. https://www.linkedin.com/in/rebecca-rossi" />
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

export default function Eventi() {
  const { plan, refreshPlan } = useAuth();
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
  const open = plan.premium || plan.admin;

  const goToForm = () => document.getElementById('candidatura')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const status = (where: string) => {
    if (state === 'in') return <p className="premium-status" data-where={where}><LuCheck aria-hidden="true" /><span>Sei dentro: cene e lezioni live sono aperte per te.</span></p>;
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
        <Button onClick={goToForm} block>Candidati agli eventi</Button>
        <p className="premium-cta__note">Gratuiti. Accesso su selezione, valutato personalmente da Andrea Bonazzi.</p>
      </div>
    );
  };

  return (
    <Screen>
      <TopBar />
      <section className="premium-hero">
        <span className="premium-hero__arch" aria-hidden="true" />
        <span className="premium-hero__kicker">Eventi · su selezione</span>
        <h1 className="premium-hero__title">Dal vivo, con Andrea.</h1>
        <p className="premium-hero__sub">Cene di networking e lezioni live. Non si comprano: si conquistano.</p>
        <ul className="premium-badges">
          <li>Gratuiti</li>
          <li>Lezioni live su Teams</li>
          <li>Cene di networking</li>
        </ul>
        {status('top')}
      </section>

      <main className="page">
        <section className="block" id="cene">
          <h2 className="h-section"><LuUtensils aria-hidden="true" /> Le cene della Lobby</h2>
          <DinnersSection onApply={state === 'apply' ? goToForm : undefined} />
        </section>

        <section className="block" id="live">
          <h2 className="h-section"><LuGraduationCap aria-hidden="true" /> Lezioni live con Andrea</h2>
          <p className="muted">
            La tappa extra del percorso, quella che si fa solo dal vivo: Andrea la tiene in diretta su Microsoft Teams, in gruppi
            piccoli. Prenoti il posto dalla pagina del corso e ricevi data e link per entrare.
          </p>
          {lives.loading && <Spinner />}
          {lives.data && (
            <ul className="live-strip">
              {lives.data.map(({ c, e }) => (
                <li key={c.id}>
                  <Link to={`/corso/${c.slug}`} className="live-strip__item">
                    <span className="live-strip__icon" aria-hidden="true">{open ? <LuRadio /> : <LuLock />}</span>
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

        {state !== 'in' && (
          <>
            <section className="letter">
              <div className="letter__head">
                <FounderAvatar size="m" />
                <div>
                  <strong>Andrea Bonazzi</strong>
                  <span>Founder e docente di THE LOBBY · <a href="#/andrea">la sua storia</a></span>
                </div>
              </div>
              <p>
                “Gli eventi sono gratuiti, ma non sono per tutti. Ogni candidatura la leggo io, una per una: guardo da dove parti,
                cosa hai già costruito e dove vuoi arrivare. Non cerco curriculum perfetti. Cerco persone pronte a fare il prossimo
                passo. Se lo sei, ti apro la porta.”
              </p>
            </section>

            <section className="block">
              <h2 className="h-section">Come si partecipa</h2>
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
          </>
        )}

        <section className="block">
          <h2 className="h-section">Per tutti e con gli eventi</h2>
          <table className="cmp">
            <thead>
              <tr><th scope="col"><span className="sr-only">Cosa</span></th><th scope="col">Per tutti</th><th scope="col" className="cmp__pro">Eventi</th></tr>
            </thead>
            <tbody>
              {COMPARE.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  <td><Cell v={r.free} /></td>
                  <td className="cmp__pro"><Cell v={r.events} /></td>
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

        {state !== 'in' && (
          <section className="premium-close">
            <span className="premium-close__arch" aria-hidden="true" />
            <h2 className="premium-close__title">Non guardare la politica da fuori. Entra.</h2>
            <p className="premium-close__sign">Andrea Bonazzi, founder di THE LOBBY</p>
            {status('bottom')}
          </section>
        )}

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
      </main>
    </Screen>
  );
}
