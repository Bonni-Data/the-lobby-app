import React, { useState } from 'react';
import { listOpportunities, OppTag, FREE_OPPORTUNITIES } from '../lib/data';
import { useAuth } from '../lib/auth';
import { Empty, ErrorState, Screen, Spinner, TopBar, useAsync } from '../components/ui';
import { OppCard, LockedCard, PremiumNudge, YouthCardPinned } from '../components/opps';
import { DinnersSection } from '../components/dinners';
import { useLocation, navigate } from '../lib/router';
import { LuLock } from 'react-icons/lu';

const FILTERS: ('tutte' | OppTag)[] = ['tutte', 'viaggio', 'lavoro', 'sviluppo'];
const FILTER_LABEL: Record<string, string> = { tutte: 'Tutte', viaggio: 'Viaggi', lavoro: 'Lavoro', sviluppo: 'Sviluppo' };

export default function Opportunities() {
  const { plan } = useAuth();
  const { query } = useLocation();
  const section = query.get('sezione') === 'cene' ? 'cene' : 'bandi';
  const data = useAsync(() => listOpportunities(), [plan.premium]);
  const [tag, setTag] = useState<'tutte' | OppTag>('tutte');

  const all = data.data || [];
  const items = all.filter((o) => tag === 'tutte' || o.tag === tag);
  const open = items.filter((o) => !o.locked);
  const locked = items.filter((o) => o.locked);
  const lockedTotal = all.filter((o) => o.locked).length;

  return (
    <Screen>
      <TopBar />
      <main className="page">
        <h1 className="h-page">Opportunità</h1>
        <div className="section-tabs" role="tablist" aria-label="Sezioni">
          <button role="tab" aria-selected={section === 'bandi'} className={section === 'bandi' ? 'is-on' : ''} onClick={() => navigate('/opportunita', true)}>
            Bandi e programmi
          </button>
          <button role="tab" aria-selected={section === 'cene'} className={section === 'cene' ? 'is-on' : ''} onClick={() => navigate('/opportunita?sezione=cene', true)}>
            Cene {!plan.premium && <LuLock aria-label="riservata a Premium" />}
          </button>
        </div>

        {section === 'cene' ? <DinnersSection /> : (<>
        <p className="muted">
          Bandi, tirocini, programmi e viaggi pubblicati da istituzioni ed enti, raccolti in un solo posto e aggiornati ogni mattina alle 7.{' '}
          {!plan.premium && lockedTotal > 0 && `Le prime ${FREE_OPPORTUNITIES} sono per tutti, l'archivio completo è Premium.`}
        </p>

        {all.length > 0 && (
          <div className="chips" role="group" aria-label="Filtra per tipo">
            {FILTERS.map((f) => (
              <button key={f} className={`chip chip--btn ${tag === f ? 'is-on' : ''}`} onClick={() => setTag(f)} aria-pressed={tag === f}>
                {FILTER_LABEL[f]}
              </button>
            ))}
          </div>
        )}

        <YouthCardPinned />

        {data.loading && <Spinner />}
        {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
        {data.data && all.length === 0 && (
          <Empty title="In arrivo" text="Stiamo selezionando le prime opportunità. Ogni mattina alle 7 la lista si aggiorna." />
        )}
        {data.data && all.length > 0 && items.length === 0 && (
          <Empty title="Niente qui, per oggi" text="In questa categoria non c'è nulla di aperto. Domattina la lista si aggiorna." />
        )}

        <ul className="opp-cards">
          {open.map((o) => <OppCard key={o.id} o={o} />)}
        </ul>

        {locked.length > 0 && (
          <>
            <PremiumNudge count={locked.length} />
            <ul className="opp-cards opp-cards--locked">
              {locked.slice(0, 6).map((o) => <LockedCard key={o.id} o={o} />)}
            </ul>
          </>
        )}
        {all.length > 0 && (
          <p className="opp-disclaimer">
            THE LOBBY non organizza né finanzia queste opportunità: le cerca e le raccoglie dalle fonti ufficiali. Viaggi, rimborsi
            e borse sono offerti dagli enti che le pubblicano, secondo i loro bandi. Prima di candidarti verifica sempre i dettagli
            sulla pagina ufficiale.
          </p>
        )}
        </>)}
      </main>
    </Screen>
  );
}
