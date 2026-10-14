import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import {
  listApplications, reviewApplication, Application, ApplicationStatus, listEvents, eventAttendees, createDinner, archiveEvent, EventItem,
  listCourses, draftCount, lessonCount,
} from '../lib/data';
import { DraftPanel } from '../components/drafts';
import { VideoTab } from '../components/videoAdmin';
import { Link, useLocation } from '../lib/router';
import { Button, Empty, ErrorState, Screen, Spinner, TopBar, toast, useAsync, formatDate } from '../components/ui';
import { LuExternalLink, LuMail, LuInbox, LuUtensils, LuUsers, LuMapPin, LuCalendarClock, LuBookOpenCheck, LuArrowRight } from 'react-icons/lu';

const TABS: { id: ApplicationStatus; label: string }[] = [
  { id: 'pending', label: 'Da valutare' },
  { id: 'approved', label: 'Attivati' },
  { id: 'rejected', label: 'Non ancora' },
];

function Card({ a, onDone }: { a: Application; onDone: () => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'' | 'approved' | 'rejected'>('');

  async function decide(decision: 'approved' | 'rejected') {
    setBusy(decision);
    try {
      await reviewApplication(a.id, decision, note.trim());
      toast(decision === 'approved' ? `Premium attivato per ${a.full_name}.` : `Risposta inviata a ${a.full_name}.`);
      onDone();
    } catch {
      toast('Operazione non riuscita. Riprova.');
    } finally {
      setBusy('');
    }
  }

  return (
    <li className="appcard">
      <div className="appcard__head">
        <div>
          <strong className="appcard__name">{a.full_name}</strong>
          <a className="appcard__mail" href={`mailto:${a.email}`}><LuMail aria-hidden="true" /> {a.email}</a>
        </div>
        <span className="muted small">{formatDate(a.created_at)}</span>
      </div>
      <dl className="appcard__body">
        <dt>Chi è oggi</dt><dd>{a.about}</dd>
        <dt>Cosa ha fatto finora</dt><dd>{a.experience}</dd>
        <dt>Il prossimo livello</dt><dd>{a.goal}</dd>
        {a.link && (<><dt>Link</dt><dd><a href={a.link} target="_blank" rel="noopener noreferrer">{a.link} <LuExternalLink aria-hidden="true" /></a></dd></>)}
      </dl>
      {a.status === 'pending' ? (
        <div className="appcard__actions">
          <label className="field">
            <span>Messaggio per {a.full_name.split(' ')[0]} (facoltativo, lo vede nell'app)</span>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es. Ottimo percorso, ti aspetto alla prossima cena." />
          </label>
          <div className="appcard__btns">
            <Button onClick={() => decide('approved')} loading={busy === 'approved'} disabled={!!busy}>Attiva Premium</Button>
            <Button variant="secondary" onClick={() => decide('rejected')} loading={busy === 'rejected'} disabled={!!busy}>Non ancora</Button>
          </div>
        </div>
      ) : (
        <p className="appcard__done">
          {a.status === 'approved' ? 'Premium attivato' : 'Non ancora'} il {formatDate(a.reviewed_at)}
          {a.reviewer_note ? ` · “${a.reviewer_note}”` : ''}
        </p>
      )}
    </li>
  );
}

function DinnerAdmin({ e, onDone }: { e: EventItem; onDone: () => void }) {
  const people = useAsync(() => eventAttendees(e.id), [e.id]);
  const yes = (people.data || []).filter((p) => p.response === 'yes');
  const no = (people.data || []).filter((p) => p.response === 'no');
  const [busy, setBusy] = useState(false);
  async function archive() {
    setBusy(true);
    try { await archiveEvent(e.id); toast('Cena archiviata.'); onDone(); } catch { toast('Operazione non riuscita.'); } finally { setBusy(false); }
  }
  return (
    <li className="appcard">
      <strong className="appcard__name">{e.title}</strong>
      <p className="dinner__meta">
        <span><LuCalendarClock aria-hidden="true" /> {e.starts_at ? new Date(e.starts_at).toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Data in arrivo'}</span>
        {e.location && <span><LuMapPin aria-hidden="true" /> {e.location}</span>}
        <span><LuUsers aria-hidden="true" /> {yes.length} presenti{e.seats ? ` su ${e.seats}` : ''} · {no.length} non presenti</span>
      </p>
      {people.loading && <Spinner />}
      {yes.length > 0 && (
        <ul className="attendees">
          {yes.map((p) => <li key={p.email}><strong>{p.full_name}</strong> <a href={`mailto:${p.email}`}>{p.email}</a></li>)}
        </ul>
      )}
      <Button variant="ghost" onClick={archive} loading={busy}>Archivia questa cena</Button>
    </li>
  );
}

function DinnersTab() {
  const list = useAsync(() => listEvents('cena'), []);
  const [form, setForm] = useState({ title: '', when: '', location: '', seats: '', summary: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function publish(ev: React.FormEvent) {
    ev.preventDefault();
    setError('');
    if (form.title.trim().length < 3 || !form.when) return setError('Servono almeno titolo, data e ora.');
    setBusy(true);
    try {
      await createDinner({
        title: form.title.trim(),
        summary: form.summary.trim(),
        starts_at: new Date(form.when).toISOString(),
        location: form.location.trim(),
        seats: form.seats ? Math.max(1, parseInt(form.seats, 10)) : null,
      });
      toast('Cena pubblicata: la vedono subito tutti i Premium.');
      setForm({ title: '', when: '', location: '', seats: '', summary: '' });
      list.reload();
    } catch {
      setError('Pubblicazione non riuscita. Riprova.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="apply admin-form" onSubmit={publish} noValidate>
        <h2 className="h-section">Pubblica una cena</h2>
        <label className="apply__field"><span className="apply__label">Titolo</span>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Es. Cena della Lobby: l'Europa vista da Bruxelles" /></label>
        <label className="apply__field"><span className="apply__label">Data e ora</span>
          <input type="datetime-local" value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} /></label>
        <label className="apply__field"><span className="apply__label">Luogo</span>
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Es. Milano, zona Brera (indirizzo ai presenti)" /></label>
        <label className="apply__field"><span className="apply__label">Posti <small>(facoltativo)</small></span>
          <input type="number" min={1} inputMode="numeric" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} placeholder="Es. 12" /></label>
        <label className="apply__field"><span className="apply__label">Descrizione</span>
          <textarea rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Di cosa si parla, chi c'è, cosa portarsi." /></label>
        {error && <div className="alert" role="alert">{error}</div>}
        <Button type="submit" block loading={busy}>Pubblica la cena</Button>
      </form>

      <h2 className="h-section">In calendario</h2>
      {list.loading && <Spinner />}
      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {list.data && list.data.length === 0 && (
        <div className="center-state"><LuUtensils size={28} /><p>Nessuna cena in calendario.</p></div>
      )}
      <ul className="appcards">
        {(list.data || []).map((e) => <DinnerAdmin key={e.id} e={e} onDone={list.reload} />)}
      </ul>
    </>
  );
}

function CoursesTab() {
  const list = useAsync(() => listCourses(), []);
  const all = list.data || [];
  const drafts = all.filter((c) => c.access_level !== 'premium' && draftCount(c) > 0);
  const live = all.filter((c) => c.access_level !== 'premium' && draftCount(c) === 0 && lessonCount(c) > 0);
  return (
    <>
      <p className="muted">Testi e quiz dei corsi gratuiti, scritti per te da validare. Li vedi solo tu finché non premi Pubblica.</p>
      {list.loading && <Spinner />}
      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {list.data && drafts.length === 0 && (
        <div className="center-state"><LuBookOpenCheck size={28} /><p>Nessun corso in attesa di validazione.</p></div>
      )}
      {drafts.length > 0 && <h2 className="h-section">Da validare ({drafts.length})</h2>}
      <ul className="appcards">
        {drafts.map((c) => (
          <li key={c.id} className="appcard">
            <div className="appcard__head">
              <div>
                <strong className="appcard__name">{c.title}</strong>
                <span className="muted small">{draftCount(c) === 1 ? '1 lezione' : `${draftCount(c)} lezioni`} con quiz in bozza</span>
              </div>
              <Link to={`/corso/${c.slug}`} className="link-quiet">Rileggi <LuArrowRight aria-hidden="true" /></Link>
            </div>
            <DraftPanel course={c} onPublished={list.reload} compact />
          </li>
        ))}
      </ul>
      {live.length > 0 && (
        <>
          <h2 className="h-section">Pubblicati ({live.length})</h2>
          <ul className="live-list">
            {live.map((c) => <li key={c.id}><Link to={`/corso/${c.slug}`}>{c.title}</Link> <span className="muted small">{lessonCount(c) === 1 ? '1 lezione' : `${lessonCount(c)} lezioni`}</span></li>)}
          </ul>
        </>
      )}
    </>
  );
}

export default function Admin() {
  const { plan } = useAuth();
  const data = useAsync(() => (plan.admin ? listApplications() : Promise.resolve([] as Application[])), [plan.admin]);
  const [tab, setTab] = useState<ApplicationStatus>('pending');
  const { query } = useLocation();
  const start = query.get('sezione');
  type Area = 'candidature' | 'cene' | 'corsi' | 'video';
  const pick = (v: string | null): Area => (v === 'corsi' || v === 'cene' || v === 'video' ? v : 'candidature');
  const [area, setArea] = useState<Area>(pick(start));
  useEffect(() => { if (start) setArea(pick(start)); }, [start]);
  const all = data.data || [];
  const items = all.filter((a) => a.status === tab);

  return (
    <Screen>
      <TopBar back="/profilo" title="Area founder" />
      <main className="page">
        {!plan.admin ? (
          <Empty title="Area riservata" text="Questa pagina è visibile solo al founder di THE LOBBY." />
        ) : (
          <>
            <h1 className="h-page">Area founder</h1>
            <div className="section-tabs" role="tablist" aria-label="Sezioni">
              <button role="tab" aria-selected={area === 'candidature'} className={area === 'candidature' ? 'is-on' : ''} onClick={() => setArea('candidature')}>Candidature</button>
              <button role="tab" aria-selected={area === 'cene'} className={area === 'cene' ? 'is-on' : ''} onClick={() => setArea('cene')}>Cene</button>
              <button role="tab" aria-selected={area === 'corsi'} className={area === 'corsi' ? 'is-on' : ''} onClick={() => setArea('corsi')}>Corsi</button>
              <button role="tab" aria-selected={area === 'video'} className={area === 'video' ? 'is-on' : ''} onClick={() => setArea('video')}>Video</button>
            </div>
            {area === 'cene' ? <DinnersTab /> : area === 'corsi' ? <CoursesTab /> : area === 'video' ? <VideoTab /> : (<>
            <p className="muted">Leggi il percorso di chi vuole entrare in Premium e decidi tu chi è pronto per il prossimo livello.</p>
            <div className="chips" role="group" aria-label="Filtra per stato">
              {TABS.map((t) => (
                <button key={t.id} className={`chip chip--btn ${tab === t.id ? 'is-on' : ''}`} onClick={() => setTab(t.id)} aria-pressed={tab === t.id}>
                  {t.label} ({all.filter((a) => a.status === t.id).length})
                </button>
              ))}
            </div>
            {data.loading && <Spinner />}
            {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
            {data.data && items.length === 0 && (
              <div className="center-state"><LuInbox size={28} /><p>{tab === 'pending' ? 'Nessuna candidatura da valutare.' : 'Ancora niente qui.'}</p></div>
            )}
            <ul className="appcards">
              {items.map((a) => <Card key={a.id} a={a} onDone={data.reload} />)}
            </ul>
            </>)}
          </>
        )}
      </main>
    </Screen>
  );
}
