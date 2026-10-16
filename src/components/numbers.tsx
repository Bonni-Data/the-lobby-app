import React from 'react';
import { adminMetrics, listReports, setReportStatus, ContentReport, Metrics } from '../lib/data';
import { ErrorState, Spinner, toast, useAsync, formatDate } from './ui';
import { Link } from '../lib/router';
import { LuTriangleAlert, LuCircleCheck, LuMessageSquareWarning } from 'react-icons/lu';

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '–');

function Tile({ n, label, hint }: { n: React.ReactNode; label: string; hint?: string }) {
  return (
    <li className="ntile">
      <strong>{n}</strong>
      <span>{label}</span>
      {hint && <small>{hint}</small>}
    </li>
  );
}

/** Email volume against the free Resend plan (100 a day, 3,000 a month). */
function EmailLimits({ m }: { m: Metrics }) {
  const day = m.sent_24h / 100;
  const month = m.sent_month / 3000;
  const warn = day >= 0.8 || month >= 0.8 || m.digest_subs >= 80;
  return (
    <section className={`nlimits ${warn ? 'is-warn' : ''}`} aria-label="Limiti del piano email gratuito">
      <h3>{warn ? <><LuTriangleAlert aria-hidden="true" /> Quasi al limite del piano email gratuito</> : 'Piano email gratuito: tutto ok'}</h3>
      <div className="nbar"><span style={{ width: `${Math.min(100, day * 100)}%` }} /></div>
      <p className="tiny">{m.sent_24h} email nelle ultime 24 ore, su 100 al giorno</p>
      <div className="nbar"><span style={{ width: `${Math.min(100, month * 100)}%` }} /></div>
      <p className="tiny">{m.sent_month} email questo mese, su 3.000</p>
      <p className="tiny muted">
        {m.digest_subs} iscritti al riepilogo del lunedì{m.deferred > 0 ? ` · ${m.deferred} email in attesa del limite` : ''}. Oltre 80 iscritti ti avviso per
        email: è il momento di passare a Resend Pro.
      </p>
    </section>
  );
}

function Reports() {
  const data = useAsync(() => listReports(), []);
  const open = (data.data || []).filter((r) => r.status === 'nuova');
  async function toggle(r: ContentReport) {
    try {
      await setReportStatus(r.id, r.status === 'nuova' ? 'gestita' : 'nuova');
      data.reload();
    } catch {
      toast('Operazione non riuscita.');
    }
  }
  if (data.loading) return null;
  if (!data.data || data.data.length === 0) return <p className="muted small">Nessuna segnalazione sulle lezioni.</p>;
  return (
    <ul className="nreports">
      {data.data.slice(0, 20).map((r) => (
        <li key={r.id} className={r.status === 'gestita' ? 'is-done' : ''}>
          <span className="tiny muted">{formatDate(r.created_at)} · <Link to={`/lezione/${r.lesson_id}`}>{r.lessons?.title || 'Lezione'}</Link></span>
          <p>{r.message}</p>
          <button className="link-quiet" onClick={() => toggle(r)}>
            {r.status === 'nuova' ? <><LuCircleCheck aria-hidden="true" /> Segna come gestita</> : 'Riapri'}
          </button>
        </li>
      ))}
      {open.length === 0 && <li className="tiny muted">Tutte gestite.</li>}
    </ul>
  );
}

/** Founder dashboard: the few numbers that say whether THE LOBBY is working. */
export function NumbersTab() {
  const data = useAsync(() => adminMetrics(), []);
  if (data.loading) return <Spinner />;
  if (data.error || !data.data) return <ErrorState message={data.error || 'Numeri non disponibili'} onRetry={data.reload} />;
  const m = data.data;
  const maxDay = Math.max(1, ...m.signups_by_day.map((d) => d.n));
  return (
    <div className="numbers">
      <p className="muted">Iscritti veri, senza contare il tuo account. Si aggiornano ogni volta che apri questa pagina.</p>
      <ul className="ntiles">
        <Tile n={m.members} label="iscritti" hint={`+${m.new_7d} in 7 giorni`} />
        <Tile n={m.active_7d} label="attivi in 7 giorni" />
        <Tile n={pct(m.activated, m.members)} label="hanno finito una lezione" hint={`${pct(m.activated_24h, m.members)} entro 24 ore`} />
        <Tile n={pct(m.returned_d7, m.eligible_d7)} label="tornano dopo 7 giorni" hint={m.eligible_d7 ? `su ${m.eligible_d7} iscritti da più di 7 giorni` : 'servono iscritti da 7 giorni'} />
        <Tile n={m.visits_7d} label="visite senza account" hint="ultimi 7 giorni" />
        <Tile n={m.opp_clicks_7d} label="clic sulle opportunità" hint="ultimi 7 giorni" />
        <Tile n={m.invited} label="arrivati da un invito" />
        <Tile n={m.applications_pending} label="candidature da valutare" hint={`${m.premium} in Premium`} />
      </ul>

      {m.signups_by_day.length > 0 && (
        <section className="block">
          <h3 className="h-section">Iscrizioni, ultimi 30 giorni</h3>
          <div className="nchart" role="img" aria-label="Iscrizioni per giorno negli ultimi 30 giorni">
            {m.signups_by_day.map((d) => (
              <span key={d.d} title={`${formatDate(d.d)}: ${d.n}`} style={{ height: `${Math.max(6, (d.n / maxDay) * 100)}%` }} />
            ))}
          </div>
        </section>
      )}

      <section className="block">
        <h3 className="h-section">Dove sono nel percorso</h3>
        <ul className="nstages">
          {m.stages.map((st, i) => (
            <li key={st.title}><span>{i + 1}. {st.title}</span><strong>{st.n}</strong></li>
          ))}
        </ul>
        <p className="tiny muted">Persone che hanno completato almeno una lezione della tappa.</p>
      </section>

      {m.sources.length > 0 && (
        <section className="block">
          <h3 className="h-section">Da dove arrivano (30 giorni)</h3>
          <ul className="nstages">
            {m.sources.map((x) => <li key={x.source}><span>{x.source}</span><strong>{x.n}</strong></li>)}
          </ul>
          <p className="tiny muted">Per le campagne usa link con ?utm_source=instagram (o tiktok, linkedin…).</p>
        </section>
      )}

      <EmailLimits m={m} />

      <section className="block">
        <h3 className="h-section">Segnalazioni sulle lezioni{m.reports_open ? ` (${m.reports_open})` : ''}</h3>
        <Reports />
      </section>
    </div>
  );
}
