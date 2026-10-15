import React, { useEffect, useState } from 'react';
import { confirmEmail } from '../lib/data';
import { useAuth } from '../lib/auth';
import { useLocation, Link } from '../lib/router';
import { ArchMark, Spinner, Wordmark } from '../components/ui';
import { LuCircleCheck, LuTriangleAlert } from 'react-icons/lu';

/** Landing page of the confirmation link sent by email. Works signed in or not. */
export default function Verify() {
  const { query } = useLocation();
  const { session, refreshPlan } = useAuth();
  const token = query.get('t') || '';
  const [state, setState] = useState<'loading' | 'ok' | 'expired' | 'invalid' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    confirmEmail(token)
      .then((r) => { setState(r === 'ok' ? 'ok' : r === 'expired' ? 'expired' : 'invalid'); if (r === 'ok') refreshPlan(); })
      .catch(() => setState('error'));
  }, [token]);

  return (
    <div className="auth">
      <header className="auth__head">
        <span className="auth__brand">
          <ArchMark size={22} />
          <Wordmark tone="ivory" size={22} />
        </span>
      </header>
      <div className="auth__card verify">
        {state === 'loading' && <Spinner label="Conferma in corso" />}
        {state === 'ok' && (
          <>
            <LuCircleCheck className="verify__icon verify__icon--ok" aria-hidden="true" />
            <h1 className="h-title">Email confermata.</h1>
            <p>Da ora ti scriviamo qui per le date delle live, i link per entrare e la risposta alla tua candidatura Premium.</p>
            <Link to={session ? '/home' : '/accedi'} className="btn btn--primary btn--block">{session ? 'Entra nella Lobby' : 'Accedi'}</Link>
          </>
        )}
        {(state === 'expired' || state === 'invalid' || state === 'error') && (
          <>
            <LuTriangleAlert className="verify__icon" aria-hidden="true" />
            <h1 className="h-title">{state === 'expired' ? 'Il link è scaduto.' : state === 'error' ? 'Qualcosa non ha funzionato.' : 'Link non valido.'}</h1>
            <p>
              {state === 'error'
                ? 'Controlla la connessione e riapri il link dall’email.'
                : 'Accedi all’app: in Home trovi il pulsante per ricevere un link nuovo.'}
            </p>
            <Link to={session ? '/home' : '/accedi'} className="btn btn--primary btn--block">{session ? 'Vai alla Home' : 'Accedi'}</Link>
          </>
        )}
      </div>
    </div>
  );
}
