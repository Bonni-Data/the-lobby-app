import React, { useState } from 'react';
import { emailUnsubscribe } from '../lib/data';
import { useAuth } from '../lib/auth';
import { useLocation } from '../lib/router';
import { Button, ButtonLink, Screen, TopBar } from '../components/ui';
import { LuMailX, LuCircleCheck } from 'react-icons/lu';

const WHAT: Record<string, { label: string; short: string }> = {
  digest: { label: 'il riepilogo del lunedì con le opportunità', short: 'il riepilogo del lunedì' },
  reminders: { label: 'i promemoria (prima lezione, serie di giorni, rientro)', short: 'i promemoria' },
  all: { label: 'tutte le email di riepilogo e i promemoria', short: 'riepiloghi e promemoria' },
};

/** Landing page of the unsubscribe link in engagement emails. Asks for a click, so link scanners cannot unsubscribe anyone. */
export default function Unsubscribe() {
  const { session } = useAuth();
  const { query } = useLocation();
  const token = query.get('u') || '';
  const kind = WHAT[query.get('k') || ''] ? (query.get('k') as string) : 'all';
  const [state, setState] = useState<'ask' | 'busy' | 'done' | 'invalid'>(/^[0-9a-f-]{36}$/i.test(token) ? 'ask' : 'invalid');

  async function confirm(what: string) {
    setState('busy');
    try {
      const r = await emailUnsubscribe(token, what);
      setState(r === 'ok' ? 'done' : 'invalid');
    } catch {
      setState('invalid');
    }
  }

  return (
    <Screen nav={!!session}>
      <TopBar back={session ? '/profilo' : '/'} title="Email" />
      <main className="page unsub">
        {state === 'done' ? (
          <section className="center-state">
            <LuCircleCheck size={34} aria-hidden="true" />
            <h1 className="h-title">Fatto.</h1>
            <p>Non riceverai più {WHAT[kind].short}. Le email importanti, come password e lezioni live che prenoti, continuano ad arrivare.</p>
            <ButtonLink to={session ? '/profilo' : '/'} variant="secondary">{session ? 'Torna al profilo' : 'Torna a THE LOBBY'}</ButtonLink>
          </section>
        ) : state === 'invalid' ? (
          <section className="center-state">
            <LuMailX size={34} aria-hidden="true" />
            <h1 className="h-title">Link non valido.</h1>
            <p>Il link potrebbe essere incompleto. Puoi scegliere quali email ricevere dal tuo profilo, oppure scriverci.</p>
            <ButtonLink to={session ? '/profilo' : '/accedi'} variant="secondary">{session ? 'Vai al profilo' : 'Accedi'}</ButtonLink>
          </section>
        ) : (
          <section className="center-state">
            <LuMailX size={34} aria-hidden="true" />
            <h1 className="h-title">Vuoi smettere di ricevere {WHAT[kind].short}?</h1>
            <p>Disattiviamo {WHAT[kind].label}. Puoi riattivarli quando vuoi dal profilo.</p>
            <Button block loading={state === 'busy'} onClick={() => confirm(kind)}>Sì, disiscrivimi</Button>
            {kind !== 'all' && (
              <button className="link-quiet center-link" onClick={() => confirm('all')} disabled={state === 'busy'}>
                Disattiva anche {kind === 'digest' ? 'i promemoria' : 'il riepilogo del lunedì'}
              </button>
            )}
          </section>
        )}
      </main>
    </Screen>
  );
}
