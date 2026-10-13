import React, { useMemo, useState } from 'react';
import { listOpportunities, CATEGORY_LABEL } from '../lib/data';
import { Empty, ErrorState, Screen, Spinner, TopBar, useAsync, formatDate } from '../components/ui';
import { LuExternalLink, LuMapPin, LuCalendar } from 'react-icons/lu';

export default function Opportunities() {
  const data = useAsync(() => listOpportunities(), []);
  const [cat, setCat] = useState('tutte');

  const cats = useMemo(() => {
    const set = new Set((data.data || []).map((o) => o.category));
    return ['tutte', ...Array.from(set)];
  }, [data.data]);

  const items = (data.data || []).filter((o) => cat === 'tutte' || o.category === cat);

  return (
    <Screen>
      <TopBar />
      <main className="page">
        <h1 className="h-page">Opportunità</h1>
        <p className="muted">Bandi, tirocini e programmi selezionati, con la scadenza sempre in vista.</p>

        {cats.length > 2 && (
          <div className="chips" role="group" aria-label="Filtra per tipo">
            {cats.map((c) => (
              <button key={c} className={`chip chip--btn ${cat === c ? 'is-on' : ''}`} onClick={() => setCat(c)} aria-pressed={cat === c}>
                {c === 'tutte' ? 'Tutte' : CATEGORY_LABEL[c] || c}
              </button>
            ))}
          </div>
        )}

        {data.loading && <Spinner />}
        {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
        {data.data && items.length === 0 && (
          <Empty
            title="In preparazione"
            text="Stiamo selezionando le prime opportunità. Le trovi qui appena pubblicate, con scadenze e requisiti."
          />
        )}

        <ul className="opp-cards">
          {items.map((o) => {
            const days = o.deadline ? Math.ceil((new Date(o.deadline).getTime() - Date.now()) / 86400000) : null;
            return (
              <li key={o.id} className="opp-card">
                <div className="opp-card__top">
                  <span className="chip">{CATEGORY_LABEL[o.category] || o.category}</span>
                  {days !== null && days >= 0 && days <= 14 && <span className="chip chip--urgent">{days === 0 ? 'Scade oggi' : `${days} giorni`}</span>}
                </div>
                <h2 className="opp-card__title">{o.title}</h2>
                {o.organization && <p className="opp-card__org">{o.organization}</p>}
                {o.summary && <p className="opp-card__sum">{o.summary}</p>}
                <p className="opp-card__meta">
                  {o.deadline && (<span><LuCalendar /> Scadenza {formatDate(o.deadline)}</span>)}
                  {o.location && (<span><LuMapPin /> {o.location}</span>)}
                </p>
                {o.url && (
                  <a className="btn btn--secondary btn--block" href={o.url} target="_blank" rel="noopener noreferrer">
                    Vai al bando <LuExternalLink />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </Screen>
  );
}
