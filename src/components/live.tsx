import React, { useEffect, useState } from 'react';
import {
  Course, LiveEdition, listLive, listCourses, isLive, liveIsOver, liveSchedule, liveComplete, rsvpEvent, eventAttendees, Attendee,
} from '../lib/data';
import { useAuth } from '../lib/auth';
import { Button, ErrorState, Spinner, toast, useAsync } from './ui';
import { VerifyBanner } from './email';
import { Link } from '../lib/router';
import {
  LuCalendarClock, LuCalendarPlus, LuCheck, LuMail, LuRadio, LuUsers, LuVideo, LuFileText, LuArrowRight, LuLock, LuSettings2,
} from 'react-icons/lu';

export const SCRIPTS_URL = 'https://claude.ai/code/artifact/37137b6a-b5c7-4227-b500-d2eab6f696a2';

export function liveWhen(iso: string) {
  const d = new Date(iso);
  const s = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) +
    ' · ore ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** «8 iscritti su 15» with a progress bar that fills up to the minimum. */
export function LiveMeter({ e, tone = 'paper' }: { e: Pick<LiveEdition, 'yes_count' | 'min_seats'>; tone?: 'paper' | 'navy' }) {
  const pct = Math.min(100, Math.round((e.yes_count / Math.max(1, e.min_seats)) * 100));
  return (
    <div className={`live-meter live-meter--${tone}`}>
      <span className="live-meter__num"><strong>{e.yes_count}</strong> / {e.min_seats} iscritti</span>
      <span className="live-meter__bar" role="progressbar" aria-valuenow={e.yes_count} aria-valuemin={0} aria-valuemax={e.min_seats} aria-label="Iscritti alla live">
        <span style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

function ics(course: Course, e: LiveEdition) {
  const start = new Date(e.starts_at!);
  const end = new Date(start.getTime() + 90 * 60_000);
  const z = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`);
  const body = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//THE LOBBY//Live//IT', 'BEGIN:VEVENT',
    `UID:${e.event_id}@thelobby`, `DTSTAMP:${z(new Date())}`, `DTSTART:${z(start)}`, `DTEND:${z(end)}`,
    `SUMMARY:${esc(`THE LOBBY · ${course.title} (live con Andrea)`)}`,
    e.join_url ? `DESCRIPTION:${esc(`Link Teams: ${e.join_url}`)}` : '',
    e.join_url ? `URL:${e.join_url}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `the-lobby-${course.slug}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function rsvpError(err: any) {
  const m = String(err?.message || '');
  if (m.includes('past_event')) return 'Questa edizione si è già svolta.';
  if (m.includes('premium_required')) return 'Le lezioni live sono riservate a chi è in Premium.';
  if (m.includes('email_not_verified')) return 'Conferma prima la tua email: è lì che arrivano data e link della live.';
  return 'Prenotazione non salvata. Riprova.';
}

/** Course page, Premium and founder: counter, booking, date and Teams link. Refreshes itself every minute. */
export function LivePanel({ course, edition }: { course: Course; edition?: LiveEdition }) {
  const { plan } = useAuth();
  const [e, setE] = useState<LiveEdition | undefined>(edition);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => setE(edition), [edition]);

  async function refresh() {
    try {
      const all = await listLive();
      setE(all.find((x) => x.course_id === course.id));
    } catch { /* keep what we have */ }
  }

  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 60_000);
    return () => clearInterval(t);
  }, [course.id]);

  if (!e) {
    return (
      <section className="live-panel" id="prenota">
        <span className="live-panel__kicker"><LuRadio aria-hidden="true" /> Lezione live su Teams</span>
        <p className="live-panel__text">La prossima edizione si apre a breve. Torna a trovarci.</p>
      </section>
    );
  }

  const enrolled = e.my_response === 'yes';
  const over = liveIsOver(e);
  const scheduled = !!e.starts_at && !over;
  const missing = Math.max(0, e.min_seats - e.yes_count);

  async function answer(r: 'yes' | 'no') {
    setBusy(true);
    try {
      const res = await rsvpEvent(e!.event_id, r);
      setE({ ...e!, my_response: res.response, yes_count: res.yes_count });
      setLeaving(false);
      toast(r === 'yes' ? 'Posto prenotato. Quando si parte, la data e il link Teams compaiono qui.' : 'Iscrizione annullata.');
      refresh();
    } catch (err) {
      toast(rsvpError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`live-panel ${enrolled ? 'is-in' : ''}`} id="prenota" aria-label="Prenotazione della lezione live">
      <span className="live-panel__kicker"><LuRadio aria-hidden="true" /> Lezione live su Teams con Andrea</span>

      {over ? (
        <p className="live-panel__text">Questa edizione si è appena conclusa. La prossima si apre a breve: torna a trovarci.</p>
      ) : scheduled ? (
        <p className="live-panel__date"><LuCalendarClock aria-hidden="true" /> {liveWhen(e.starts_at!)}</p>
      ) : null}

      {!over && <LiveMeter e={e} />}

      {!over && !scheduled && (
        <p className="live-panel__text">
          {missing > 0
            ? <>Si parte a {e.min_seats} iscritti: {missing === 1 ? 'manca 1 persona' : `mancano ${missing} persone`}. Appena ci arriviamo, Andrea fissa la data e il link Teams compare qui.</>
            : <>Ci siamo: {e.yes_count} iscritti. Andrea sta fissando la data: la trovi qui, insieme al link Teams.</>}
        </p>
      )}
      {scheduled && !enrolled && <p className="live-panel__text">La data è fissata. Prenota il posto per ricevere il link Teams.</p>}

      {!over && (enrolled ? (
        <div className="live-panel__in">
          <span className="live-panel__badge"><LuCheck aria-hidden="true" /> Sei iscritto</span>
          {scheduled && e.join_url && (
            <a className="btn btn--primary btn--block" href={e.join_url} target="_blank" rel="noopener noreferrer"><LuVideo aria-hidden="true" /> Entra su Teams</a>
          )}
          {scheduled && (
            <Button variant="secondary" block onClick={() => ics(course, e)}><LuCalendarPlus aria-hidden="true" /> Aggiungi al calendario</Button>
          )}
          {leaving ? (
            <div className="live-panel__confirm">
              <span>Lasci il tuo posto?</span>
              <Button variant="secondary" onClick={() => answer('no')} loading={busy}>Sì, annulla</Button>
              <Button variant="ghost" onClick={() => setLeaving(false)} disabled={busy}>No</Button>
            </div>
          ) : (
            <button className="live-panel__leave" onClick={() => setLeaving(true)}>Annulla l'iscrizione</button>
          )}
        </div>
      ) : plan.email_verified ? (
        <Button block onClick={() => answer('yes')} loading={busy}>Prenota il tuo posto</Button>
      ) : (
        <VerifyBanner compact />
      ))}

      {plan.admin && (
        <Link to="/admin?sezione=live" className="live-panel__admin"><LuSettings2 aria-hidden="true" /> Gestisci iscritti, data e link</Link>
      )}
    </section>
  );
}

/** Course page for members who are not in Premium yet. */
export function LiveTeaser({ edition }: { edition?: LiveEdition }) {
  return (
    <section className="live-panel live-panel--locked">
      <span className="live-panel__kicker"><LuLock aria-hidden="true" /> Lezione live su Teams con Andrea</span>
      <p className="live-panel__text">
        Questo corso si fa dal vivo, su Microsoft Teams. Si parte a {edition?.min_seats ?? 15} iscritti: chi è in Premium vede il
        programma completo e prenota il posto da qui.
      </p>
      {edition && edition.yes_count > 0 && (
        <p className="live-panel__count"><LuUsers aria-hidden="true" /> {edition.yes_count === 1 ? '1 persona ha già prenotato' : `${edition.yes_count} persone hanno già prenotato`}</p>
      )}
    </section>
  );
}

/* ---------- Area founder ---------- */
function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function LiveAdminCard({ course, e, onChanged }: { course: Course; e: LiveEdition; onChanged: () => void }) {
  const [people, setPeople] = useState<Attendee[] | null>(null);
  const [when, setWhen] = useState(toLocalInput(e.starts_at));
  const [url, setUrl] = useState(e.join_url || '');
  const [busy, setBusy] = useState<'' | 'save' | 'done'>('');
  const [confirmDone, setConfirmDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    eventAttendees(e.event_id).then((p) => alive && setPeople(p)).catch(() => alive && setPeople([]));
    return () => { alive = false; };
  }, [e.event_id, e.yes_count]);

  useEffect(() => { setWhen(toLocalInput(e.starts_at)); setUrl(e.join_url || ''); }, [e.starts_at, e.join_url]);

  const yes = (people || []).filter((p) => p.response === 'yes');
  const ready = e.yes_count >= e.min_seats;
  const over = liveIsOver(e);
  const status = e.starts_at
    ? over ? { cls: 'done', label: 'Svolta: chiudi l’edizione' } : { cls: 'set', label: 'Data fissata' }
    : ready ? { cls: 'ready', label: 'Pronta: fissa la data' } : { cls: 'open', label: 'Raccolta iscrizioni' };
  const bcc = yes.map((p) => p.email).join(',');

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    setError('');
    if (!when) return setError('Scegli data e ora.');
    if (!/^https:\/\/\S+$/i.test(url.trim())) return setError('Incolla il link della riunione Teams (inizia con https://).');
    setBusy('save');
    try {
      await liveSchedule(e.event_id, new Date(when).toISOString(), url.trim());
      toast(e.starts_at ? 'Data e link aggiornati.' : 'Data fissata: gli iscritti vedono data e link nel corso.');
      onChanged();
    } catch {
      setError('Salvataggio non riuscito. Riprova.');
    } finally {
      setBusy('');
    }
  }

  async function complete() {
    setBusy('done');
    try {
      await liveComplete(e.event_id);
      toast('Edizione chiusa. Le prenotazioni ripartono da zero per la prossima.');
      setConfirmDone(false);
      onChanged();
    } catch {
      toast('Operazione non riuscita. Riprova.');
    } finally {
      setBusy('');
    }
  }

  return (
    <li className={`appcard live-admin live-admin--${status.cls}`}>
      <div className="appcard__head">
        <div>
          <strong className="appcard__name">{course.title}</strong>
          <span className={`live-admin__status live-admin__status--${status.cls}`}>{status.label}</span>
        </div>
        <Link to={`/corso/${course.slug}`} className="link-quiet">Apri <LuArrowRight aria-hidden="true" /></Link>
      </div>
      <LiveMeter e={e} />
      {e.starts_at && <p className="live-admin__when"><LuCalendarClock aria-hidden="true" /> {liveWhen(e.starts_at)}</p>}

      {people === null ? <Spinner /> : yes.length > 0 ? (
        <>
          <ol className="attendees attendees--num">
            {yes.map((p) => <li key={p.email}><strong>{p.full_name}</strong> <a href={`mailto:${p.email}`}>{p.email}</a></li>)}
          </ol>
          <a className="link-quiet live-admin__mail" href={`mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(`THE LOBBY · ${course.title}: la live`)}`}>
            <LuMail aria-hidden="true" /> Scrivi a tutti gli iscritti
          </a>
        </>
      ) : <p className="muted small">Ancora nessun iscritto.</p>}

      <form className="live-admin__form" onSubmit={save} noValidate>
        <label className="apply__field"><span className="apply__label">Data e ora della live</span>
          <input type="datetime-local" value={when} onChange={(ev) => setWhen(ev.target.value)} /></label>
        <label className="apply__field"><span className="apply__label">Link della riunione Teams</span>
          <input type="url" inputMode="url" value={url} onChange={(ev) => setUrl(ev.target.value)} placeholder="https://teams.microsoft.com/l/meetup-join/..." /></label>
        {error && <div className="alert" role="alert">{error}</div>}
        <Button type="submit" variant={ready || e.starts_at ? 'primary' : 'secondary'} loading={busy === 'save'} disabled={!!busy}>
          {e.starts_at ? 'Aggiorna data e link' : 'Fissa data e link'}
        </Button>
        {!ready && !e.starts_at && <p className="small muted">Puoi fissarla anche prima dei {e.min_seats} iscritti, se vuoi partire comunque.</p>}
      </form>

      {e.starts_at && (confirmDone ? (
        <div className="draft-panel__confirm">
          <span>La live si è svolta? Chiudo l’edizione e riapro le prenotazioni da zero.</span>
          <div className="draft-panel__btns">
            <Button onClick={complete} loading={busy === 'done'}>Sì, chiudi l’edizione</Button>
            <Button variant="ghost" onClick={() => setConfirmDone(false)} disabled={!!busy}>Annulla</Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setConfirmDone(true)} disabled={!!busy}>Segna come svolta</Button>
      ))}
    </li>
  );
}

export function LiveAdminTab() {
  const data = useAsync(async () => {
    const [courses, live] = await Promise.all([listCourses(), listLive()]);
    return { courses: courses.filter(isLive), live };
  }, []);
  const [live, setLive] = useState<LiveEdition[] | null>(null);

  useEffect(() => { if (data.data) setLive(data.data.live); }, [data.data]);
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') listLive().then(setLive).catch(() => {});
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  const refresh = () => listLive().then(setLive).catch(() => data.reload());
  const courses = data.data?.courses || [];
  const rows = courses.map((c) => ({ c, e: (live || []).find((x) => x.course_id === c.id) }));
  const ready = rows.filter((r) => r.e && !r.e.starts_at && r.e.yes_count >= r.e.min_seats).length;

  return (
    <>
      <p className="muted">
        Le lezioni live su Teams. Il contatore si aggiorna da solo: quando un corso arriva a 15 iscritti, fissa data e link e gli
        iscritti li trovano subito nella pagina del corso.
      </p>
      <div className="video-summary">
        {ready > 0 && <span><strong>{ready}</strong> {ready === 1 ? 'pronta da fissare' : 'pronte da fissare'}</span>}
        <span><strong>{(live || []).reduce((n, e) => n + e.yes_count, 0)}</strong> prenotazioni in tutto</span>
        <a href={SCRIPTS_URL} target="_blank" rel="noopener noreferrer" className="link-quiet"><LuFileText aria-hidden="true" /> Le tue scalette</a>
      </div>
      {data.loading && !data.data && <Spinner />}
      {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
      <ul className="appcards">
        {rows.map(({ c, e }) => e
          ? <LiveAdminCard key={c.id} course={c} e={e} onChanged={refresh} />
          : <li key={c.id} className="appcard"><strong className="appcard__name">{c.title}</strong><p className="muted small">Nessuna edizione aperta.</p></li>)}
      </ul>
    </>
  );
}
