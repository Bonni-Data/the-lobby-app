import React, { useEffect, useState } from 'react';
import { listOpportunities, track, OppTag } from '../lib/data';
import { useAuth } from '../lib/auth';
import { ButtonLink, Empty, ErrorState, Screen, Spinner, TopBar, useAsync } from '../components/ui';
import { OppCard, YouthCardPinned } from '../components/opps';
import { DinnersSection } from '../components/dinners';
import { useLocation, navigate } from '../lib/router';
import { LuLock } from 'react-icons/lu';

const FILTERS: ('tutte' | OppTag)[] = ['tutte', 'viaggio', 'lavoro', 'sviluppo'];
const FILTER_LABEL: Record<string, string> = { tutte: 'Tutte', viaggio: 'Viaggi', lavoro: 'Lavoro', sviluppo: 'Sviluppo' };

export default function Opportunities() {
  const { plan, session } = useAuth();
  const { query } = useLocation();
  const section = query.get('sezione') === 'cene' && session ? 'cene' : 'bandi';
  const data = useAsync(() => listOpportunities(), []);
  const [tag, setTag] = useState<'tutte' | OppTag>('tutte');
  useEffect(() => { track(session ? 'page' : 'visit', { page: 'opportunita' }); }, []);

  const all = data.data || [];
  const items = all.filter((o) => tag === 'tutte' || o.tag === tag);

  return (
    <Screen nav={!!session}>
      <TopBar back={session ? undefined : '/'} />
      <main className="page">
        <h1 className="h-page">Opportunità</h1>
        {!session && (
          <aside className="guest-cta">
            <p><strong>Sono tutte gratis, anche senza account.</strong> Con l'account segui il percorso dell'Academy e ogni lunedì ti arrivano le nuove opportunità.</p>
            <ButtonLink to="/accedi?tab=registrati" block>Crea il tuo account gratis</ButtonLink>
          </aside>
        )}
        {session && <div className="section-tabs" role="tablist" aria-label="Sezioni">
          <button role="tab" aria-selected={section === 'bandi'} className={section === 'bandi' ? 'is-on' : ''} onClick={() => navigate('/opportunita', true)}>
            Bandi e programmi
          </button>
          <button role="tab" aria-selected={section === 'cene'} className={section === 'cene' ? 'is-on' : ''} onClick={() => navigate('/opportunita?sezione=cene', true)}>
            Cene {!plan.premium && <LuLock aria-label="riservata a Premium" />}
          </button>
        </div>}

        {section === 'cene' ? <DinnersSection /> : (<>
        <p className="muted">
          Bandi, tirocini, programmi e viaggi pubblicati da istituzioni ed enti, raccolti in un solo posto e aggiornati ogni mattina
          alle 7. Tutti gratis, per tutti.
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
          {items.map((o) => <OppCard key={o.id} o={o} />)}
        </ul>
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
