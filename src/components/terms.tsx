import React, { useState } from 'react';
import { auth, signupSource } from '../lib/api';
import { TERMS_VERSION } from '../config';
import { ArchMark, Button, Wordmark, toast } from './ui';
import { navigate } from '../lib/router';

/** One-time step for accounts that never accepted the terms (Google sign-in, older accounts). */
export function TermsGate() {
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!accept) return setError('Per continuare conferma età e accettazione dei Termini.');
    setBusy(true);
    try {
      await auth.updateMetadata({ terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString(), ...signupSource() });
      toast('Benvenuto nella Lobby.');
    } catch {
      setError('Salvataggio non riuscito. Riprova.');
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    await auth.signOut();
    navigate('/', true);
  }

  return (
    <div className="auth">
      <header className="auth__head">
        <span className="auth__brand">
          <ArchMark size={22} />
          <Wordmark tone="ivory" size={22} />
        </span>
      </header>
      <form className="auth__card form terms-gate" onSubmit={go} noValidate>
        <h1 className="h-title">Un ultimo passo.</h1>
        <p className="muted">Prima di entrare, conferma queste due cose. Lo chiediamo una volta sola.</p>
        <label className="check">
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
          <span>
            Ho almeno 14 anni, accetto i <a href="#/termini" target="_blank" rel="noopener">Termini di servizio</a> e ho letto
            l'<a href="#/privacy" target="_blank" rel="noopener">Informativa privacy</a>.
          </span>
        </label>
        {error && <div className="alert" role="alert">{error}</div>}
        <Button type="submit" block loading={busy}>Entra nella Lobby</Button>
        <button type="button" className="link-quiet" onClick={leave}>Non ora, esci</button>
      </form>
    </div>
  );
}
