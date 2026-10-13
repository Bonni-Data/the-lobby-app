import React, { useState } from 'react';
import { auth } from '../lib/api';
import { navigate, Link } from '../lib/router';
import { ArchMark, Button, Wordmark, toast } from '../components/ui';
import { LuArrowLeft } from 'react-icons/lu';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError('Inserisci un indirizzo email valido.');
    setBusy(true);
    try {
      const base = window.location.origin + window.location.pathname;
      await auth.recover(email.trim().toLowerCase(), base);
      setSent(true);
    } catch (err: any) {
      setError(err?.status === 429 ? 'Troppe richieste. Riprova tra qualche minuto.' : "Invio non riuscito. Riprova tra poco.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <header className="auth__head">
        <Link to="/accedi" className="iconbtn iconbtn--light" aria-label="Indietro">
          <LuArrowLeft />
        </Link>
        <span className="auth__brand">
          <ArchMark size={22} />
          <Wordmark tone="ivory" size={22} />
        </span>
      </header>
      <div className="auth__card">
        <h1 className="h-title">Recupera la password</h1>
        {sent ? (
          <>
            <p>Se esiste un account per <strong>{email}</strong>, riceverai un link per scegliere una nuova password.</p>
            <Link to="/accedi" className="btn btn--secondary btn--block">Torna ad Accedi</Link>
          </>
        ) : (
          <form onSubmit={submit} noValidate className="form">
            <p className="muted">Inserisci l'email dell'account: ti mandiamo un link per reimpostarla.</p>
            <label className="field">
              <span>Email</span>
              <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </label>
            {error && <div className="alert" role="alert">{error}</div>}
            <Button type="submit" block loading={busy}>Invia il link</Button>
          </form>
        )}
      </div>
    </div>
  );
}

export function NewPassword() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (pw.length < 8) return setError('La password deve avere almeno 8 caratteri.');
    if (pw !== pw2) return setError('Le due password non coincidono.');
    setBusy(true);
    try {
      await auth.updatePassword(pw);
      toast('Password aggiornata.');
      navigate('/home', true);
    } catch {
      setError('Il link è scaduto o non è valido. Richiedine uno nuovo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <header className="auth__head">
        <span className="auth__brand">
          <ArchMark size={22} />
          <Wordmark tone="ivory" size={22} />
        </span>
      </header>
      <div className="auth__card">
        <h1 className="h-title">Nuova password</h1>
        <form onSubmit={submit} noValidate className="form">
          <label className="field">
            <span>Nuova password</span>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" placeholder="Almeno 8 caratteri" />
          </label>
          <label className="field">
            <span>Conferma password</span>
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          </label>
          {error && <div className="alert" role="alert">{error}</div>}
          <Button type="submit" block loading={busy}>Salva la password</Button>
        </form>
      </div>
    </div>
  );
}
