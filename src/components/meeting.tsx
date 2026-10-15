import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import {
  requestMeeting, myMeetings, listMeetings, setMeetingStatus, MEETING_TOPICS, MEETING_MODES, MeetingTopic, MeetingMode, MeetingRequest,
} from '../lib/data';
import { Button, Spinner, ErrorState, toast, useAsync, formatDate } from './ui';
import { Link } from '../lib/router';
import { LuCheck, LuClock, LuMail, LuPhone, LuLink, LuCalendarClock, LuInbox, LuRotateCcw } from 'react-icons/lu';

const DURATIONS: { min: 5 | 15 | 30; label: string; hint: string }[] = [
  { min: 5, label: '5 min', hint: 'Una domanda secca' },
  { min: 15, label: '15 min', hint: 'Un consiglio, un confronto' },
  { min: 30, label: '30 min', hint: 'Rivediamo insieme un testo' },
];
const MSG_MIN = 20;
const MSG_MAX = 1500;

const topicLabel = (t: MeetingTopic) => MEETING_TOPICS.find((x) => x.id === t)?.label || t;
const modeLabel = (m: MeetingMode) => MEETING_MODES.find((x) => x.id === m)?.label || m;

function friendly(err: any) {
  const m = String(err?.message || '');
  if (m.includes('premium_only')) return 'Gli incontri con Andrea sono riservati a chi è in Premium.';
  if (m.includes('bad_name')) return 'Scrivi nome e cognome.';
  if (m.includes('bad_email')) return 'Controlla l’indirizzo email.';
  if (m.includes('bad_phone')) return 'Il numero di telefono non sembra valido.';
  if (m.includes('too_short')) return `Racconta in qualche riga in più di cosa hai bisogno (almeno ${MSG_MIN} caratteri).`;
  if (m.includes('too_long')) return 'Il testo è troppo lungo: tienilo sotto i 1.500 caratteri.';
  if (m.includes('bad_link')) return 'Il link deve iniziare con https://';
  if (m.includes('too_many')) return 'Hai già inviato tre richieste questa settimana: Andrea ti risponde a breve.';
  return 'Invio non riuscito. Controlla la connessione e riprova.';
}

/** Premium page: book a short meeting with Andrea. The request reaches his email. */
export function MeetingSection() {
  const { session, displayName } = useAuth();
  const mine = useAsync(() => myMeetings(), [session?.user?.id]);
  const [name, setName] = useState(displayName || '');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState<MeetingTopic>('consiglio');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [minutes, setMinutes] = useState<5 | 15 | 30>(15);
  const [mode, setMode] = useState<MeetingMode>('video');
  const [availability, setAvailability] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<{ minutes: number; topic: MeetingTopic; mode: MeetingMode } | null>(null);

  const pending = (mine.data || []).find((m) => m.status === 'nuova');

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) return setError('Scrivi nome e cognome.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError('Controlla l’indirizzo email.');
    if (message.trim().length < MSG_MIN) return setError(`Racconta in qualche riga in più di cosa hai bisogno (almeno ${MSG_MIN} caratteri).`);
    if (link.trim() && !/^https?:\/\//i.test(link.trim())) return setError('Il link deve iniziare con https://');
    setBusy(true);
    try {
      await requestMeeting({
        name: name.trim(), email: email.trim(), phone: phone.trim() || null, topic, message: message.trim(),
        link: link.trim() || null, minutes, mode, availability: availability.trim() || null,
      });
      setSent({ minutes, topic, mode });
      setMessage('');
      setLink('');
      toast('Richiesta inviata ad Andrea.');
      mine.reload();
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="block meet" id="incontro">
      <h2 className="h-section">Prenota un incontro con Andrea</h2>
      <p className="muted">
        Per rivedere un testo, fare le tue domande o chiedere un consiglio. Scegli quanto tempo ti serve: Andrea ti scrive per fissare giorno e ora.
      </p>

      {sent ? (
        <div className="meet__done" role="status">
          <span className="meet__done-icon" aria-hidden="true"><LuCheck /></span>
          <div>
            <strong>Richiesta inviata.</strong>
            <span>{sent.minutes} minuti · {topicLabel(sent.topic)} · {modeLabel(sent.mode)}. Andrea ti scrive per fissare giorno e ora.</span>
            <button className="link-quiet" onClick={() => setSent(null)}>Fai un’altra richiesta</button>
          </div>
        </div>
      ) : (
        <>
          {pending && (
            <p className="meet__pending">
              <LuClock aria-hidden="true" /> Hai già chiesto un incontro di {pending.minutes} minuti il {formatDate(pending.created_at)}: Andrea ti scrive a breve. Puoi comunque mandarne un’altra.
            </p>
          )}
          <form className="apply meet__form" onSubmit={send} noValidate>
            <div className="meet__row">
              <label className="field">
                <span>Nome e cognome</span>
                <input value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} autoComplete="name" />
              </label>
              <label className="field">
                <span>Email</span>
                <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value.slice(0, 200))} autoComplete="email" />
              </label>
            </div>
            <label className="field">
              <span>Telefono <small className="muted">(facoltativo)</small></span>
              <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.slice(0, 20))} autoComplete="tel" placeholder="+39 …" />
            </label>

            <fieldset className="meet__group">
              <legend>Di cosa hai bisogno</legend>
              <div className="chips" role="radiogroup" aria-label="Di cosa hai bisogno">
                {MEETING_TOPICS.map((t) => (
                  <button type="button" key={t.id} role="radio" aria-checked={topic === t.id} className={`chip chip--btn ${topic === t.id ? 'is-on' : ''}`} onClick={() => setTopic(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="apply__field">
              <span className="apply__label">Raccontami in breve</span>
              <span className="apply__hint">Cosa ti serve e cosa vorresti portarti a casa dall’incontro.</span>
              <textarea
                value={message}
                onChange={(e) => { setMessage(e.target.value.slice(0, MSG_MAX)); if (error) setError(''); }}
                rows={4}
                placeholder={topic === 'testo' ? 'Es. Ho scritto il mio primo intervento per il consiglio comunale e vorrei capire se funziona.' : 'Es. Sto scegliendo tra un tirocinio a Bruxelles e uno in Regione: mi aiuti a decidere?'}
              />
              <span className={`apply__count ${message.trim().length >= MSG_MIN ? 'is-ok' : ''}`}>
                {message.trim().length < MSG_MIN ? `Ancora ${MSG_MIN - message.trim().length} caratteri` : <><LuCheck aria-hidden="true" /> Ok</>}
              </span>
            </label>

            <label className="field">
              <span>{topic === 'testo' ? 'Link al testo da rivedere' : 'Un link utile'} <small className="muted">(facoltativo)</small></span>
              <input type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value.slice(0, 300))} placeholder="https://docs.google.com/…" />
            </label>

            <fieldset className="meet__group">
              <legend>Quanto tempo ti serve</legend>
              <div className="meet__dur" role="radiogroup" aria-label="Durata dell'incontro">
                {DURATIONS.map((d) => (
                  <button type="button" key={d.min} role="radio" aria-checked={minutes === d.min} className={minutes === d.min ? 'is-on' : ''} onClick={() => setMinutes(d.min)}>
                    <strong>{d.label}</strong>
                    <span>{d.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="meet__group">
              <legend>Come preferisci</legend>
              <div className="chips" role="radiogroup" aria-label="Come preferisci sentirti">
                {MEETING_MODES.map((m) => (
                  <button type="button" key={m.id} role="radio" aria-checked={mode === m.id} className={`chip chip--btn ${mode === m.id ? 'is-on' : ''}`} onClick={() => setMode(m.id)}>
                    {m.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="field">
              <span>Quando sei disponibile <small className="muted">(facoltativo)</small></span>
              <input value={availability} onChange={(e) => setAvailability(e.target.value.slice(0, 200))} placeholder="Es. sere infrasettimanali dopo le 18" />
            </label>

            {error && <div className="alert" role="alert">{error}</div>}
            <Button type="submit" block loading={busy}>Invia la richiesta</Button>
            <p className="apply__note">
              La richiesta arriva ad Andrea via email. Usiamo questi dati solo per organizzare l’incontro: leggi l’<Link to="/privacy">Informativa privacy</Link>.
            </p>
          </form>
        </>
      )}
    </section>
  );
}

/* ---------- Area founder ---------- */

export function MeetingsAdminTab() {
  const data = useAsync(() => listMeetings(), []);
  const [tab, setTab] = useState<'nuova' | 'gestita'>('nuova');
  const all = data.data || [];
  const items = all.filter((m) => m.status === tab);
  return (
    <>
      <p className="muted">Le richieste di incontro di chi è in Premium. Ti arrivano anche per email: rispondi da lì, o da qui con un tocco.</p>
      <div className="chips" role="group" aria-label="Filtra per stato">
        {(['nuova', 'gestita'] as const).map((s) => (
          <button key={s} className={`chip chip--btn ${tab === s ? 'is-on' : ''}`} onClick={() => setTab(s)} aria-pressed={tab === s}>
            {s === 'nuova' ? 'Da gestire' : 'Gestite'} ({all.filter((m) => m.status === s).length})
          </button>
        ))}
      </div>
      {data.loading && <Spinner />}
      {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
      {data.data && items.length === 0 && (
        <div className="center-state"><LuInbox size={28} /><p>{tab === 'nuova' ? 'Nessuna richiesta da gestire.' : 'Ancora niente qui.'}</p></div>
      )}
      <ul className="meet-cards">
        {items.map((m) => <MeetingCard key={m.id} m={m} onChanged={data.reload} />)}
      </ul>
    </>
  );
}

function MeetingCard({ m, onChanged }: { m: MeetingRequest; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const subject = encodeURIComponent(`THE LOBBY · il nostro incontro di ${m.minutes} minuti`);
  const body = encodeURIComponent(`Ciao ${m.name.split(' ')[0]},\n\nho letto la tua richiesta. Ti propongo:\n\n- giorno:\n- ora:\n- ${m.mode === 'video' ? 'link:' : m.mode === 'telefono' ? 'ti chiamo io al tuo numero' : 'luogo:'}\n\nA presto,\nAndrea`);

  async function toggle() {
    setBusy(true);
    try {
      await setMeetingStatus(m.id, m.status === 'nuova' ? 'gestita' : 'nuova');
      toast(m.status === 'nuova' ? 'Segnata come gestita.' : 'Riaperta.');
      onChanged();
    } catch {
      toast('Salvataggio non riuscito.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={`meet-card ${m.status === 'gestita' ? 'is-done' : ''}`}>
      <div className="meet-card__head">
        <strong>{m.name}</strong>
        <span className="chip">{m.minutes} min</span>
        <span className="chip">{topicLabel(m.topic)}</span>
        <span className="chip">{modeLabel(m.mode)}</span>
      </div>
      <p className="meet-card__msg">{m.message}</p>
      <ul className="meet-card__facts">
        <li><LuMail aria-hidden="true" /> <a href={`mailto:${m.email}?subject=${subject}&body=${body}`}>{m.email}</a></li>
        {m.phone && <li><LuPhone aria-hidden="true" /> <a href={`tel:${m.phone.replace(/[^0-9+]/g, '')}`}>{m.phone}</a></li>}
        {m.availability && <li><LuCalendarClock aria-hidden="true" /> {m.availability}</li>}
        {m.link && <li><LuLink aria-hidden="true" /> <a href={m.link} target="_blank" rel="noopener noreferrer">{m.link.replace(/^https?:\/\//, '').slice(0, 48)}</a></li>}
      </ul>
      <div className="meet-card__foot">
        <span className="small muted">Richiesta il {formatDate(m.created_at)}</span>
        <a className="btn btn--primary" href={`mailto:${m.email}?subject=${subject}&body=${body}`}><LuMail aria-hidden="true" /> Rispondi</a>
        <Button variant="secondary" onClick={toggle} loading={busy}>
          {m.status === 'nuova' ? <><LuCheck aria-hidden="true" /> Gestita</> : <><LuRotateCcw aria-hidden="true" /> Riapri</>}
        </Button>
      </div>
    </li>
  );
}
