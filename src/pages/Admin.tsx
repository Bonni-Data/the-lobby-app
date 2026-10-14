import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { listApplications, reviewApplication, Application, ApplicationStatus } from '../lib/data';
import { Button, Empty, ErrorState, Screen, Spinner, TopBar, toast, useAsync, formatDate } from '../components/ui';
import { LuExternalLink, LuMail, LuInbox } from 'react-icons/lu';

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

export default function Admin() {
  const { plan } = useAuth();
  const data = useAsync(() => (plan.admin ? listApplications() : Promise.resolve([] as Application[])), [plan.admin]);
  const [tab, setTab] = useState<ApplicationStatus>('pending');
  const all = data.data || [];
  const items = all.filter((a) => a.status === tab);

  return (
    <Screen>
      <TopBar back="/profilo" title="Candidature Premium" />
      <main className="page">
        {!plan.admin ? (
          <Empty title="Area riservata" text="Questa pagina è visibile solo al founder di THE LOBBY." />
        ) : (
          <>
            <h1 className="h-page">Candidature</h1>
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
          </>
        )}
      </main>
    </Screen>
  );
}
