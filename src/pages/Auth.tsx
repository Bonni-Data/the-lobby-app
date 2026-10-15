import React, { useEffect, useState } from 'react';
import { auth, ApiError } from '../lib/api';
import { assertEmailAvailable } from '../lib/data';
import { navigate, useLocation, Link } from '../lib/router';
import { ArchMark, Button, Wordmark, toast } from '../components/ui';
import { LuEye, LuEyeOff, LuArrowLeft } from 'react-icons/lu';

type Tab = 'accedi' | 'registrati';

function friendly(e: unknown, tab: Tab): { text: string; emailTaken?: boolean } {
  const err = e as ApiError;
  const code = (err?.code || '').toString();
  const msg = (err?.message || '').toLowerCase();
  if (code === 'network') return { text: err.message };
  if (msg.includes('email_already_registered') || code === 'user_already_exists' || msg.includes('already registered'))
    return { text: 'Questa email è già registrata. Accedi con la tua password.', emailTaken: true };
  if (code === 'invalid_credentials' || msg.includes('invalid login'))
    return { text: 'Email o password non corretti.' };
  if (code === 'email_not_confirmed') return { text: "Conferma prima la tua email, poi accedi." };
  if (code === 'weak_password' || msg.includes('password should be'))
    return { text: 'Password troppo debole: usa almeno 8 caratteri, con lettere e numeri.' };
  if (code === 'validation_failed' || msg.includes('invalid format') || msg.includes('unable to validate email'))
    return { text: "Controlla l'indirizzo email." };
  if (err?.status === 429) return { text: 'Troppi tentativi. Attendi un minuto e riprova.' };
  return { text: tab === 'accedi' ? 'Accesso non riuscito. Riprova.' : 'Registrazione non riuscita. Riprova.' };
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** Shown only when Google is switched on in Supabase, so it can be enabled without a new release. */
function GoogleButton() {
  const [on, setOn] = useState(false);
  useEffect(() => { auth.providers().then((p) => setOn(!!p.google)); }, []);
  if (!on) return null;
  const back = window.location.origin + window.location.pathname + window.location.search;
  return (
    <div className="oauth">
      <span className="oauth__or">oppure</span>
      <a className="btn btn--secondary btn--block oauth__google" href={auth.googleUrl(back)}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
        </svg>
        Continua con Google
      </a>
    </div>
  );
}

export default function Auth() {
  const { query } = useLocation();
  const [tab, setTab] = useState<Tab>(query.get('tab') === 'registrati' ? 'registrati' : 'accedi');
  const oauthError = query.get('errore');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; emailTaken?: boolean } | null>(null);
  const [checkInbox, setCheckInbox] = useState(false);
  const [accept, setAccept] = useState(false);

  function switchTab(t: Tab) {
    setTab(t);
    setError(null);
    setPassword('');
    setConfirm('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const mail = email.trim().toLowerCase();
    if (!isEmail(mail)) return setError({ text: "Inserisci un indirizzo email valido." });

    if (tab === 'registrati') {
      if (name.trim().length < 2) return setError({ text: 'Scrivi il tuo nome.' });
      if (password.length < 8) return setError({ text: 'La password deve avere almeno 8 caratteri.' });
      if (password !== confirm) return setError({ text: 'Le due password non coincidono.' });
      if (!accept) return setError({ text: "Per creare l'account accetta i Termini di servizio." });
    } else if (!password) {
      return setError({ text: 'Inserisci la password.' });
    }

    setBusy(true);
    try {
      if (tab === 'accedi') {
        await auth.signIn(mail, password);
        navigate('/home', true);
      } else {
        await assertEmailAvailable(mail);
        const { session } = await auth.signUp(mail, password, name.trim());
        if (session) {
          toast(`Benvenuto nella Lobby, ${name.trim().split(' ')[0]}.`);
          navigate('/home', true);
        } else {
          setCheckInbox(true);
        }
      }
    } catch (err) {
      const f = friendly(err, tab);
      setError(f);
      if (f.emailTaken) {
        setTab('accedi');
        setPassword('');
        setConfirm('');
      }
    } finally {
      setBusy(false);
    }
  }

  if (checkInbox) {
    return (
      <div className="auth">
        <div className="auth__card auth__card--center">
          <ArchMark size={40} />
          <h1 className="h-title">Controlla la tua email</h1>
          <p>Ti abbiamo scritto a <strong>{email}</strong>. Apri il link per confermare l'account, poi accedi.</p>
          <Button variant="secondary" onClick={() => { setCheckInbox(false); switchTab('accedi'); }}>Vai ad Accedi</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth">
      <header className="auth__head">
        <Link to="/" className="iconbtn iconbtn--light" aria-label="Indietro">
          <LuArrowLeft />
        </Link>
        <span className="auth__brand">
          <ArchMark size={22} />
          <Wordmark tone="ivory" size={22} />
        </span>
      </header>

      <div className="auth__card">
        <div className="segmented" role="tablist" aria-label="Accesso o registrazione">
          <button role="tab" aria-selected={tab === 'accedi'} className={tab === 'accedi' ? 'is-on' : ''} onClick={() => switchTab('accedi')}>
            Accedi
          </button>
          <button role="tab" aria-selected={tab === 'registrati'} className={tab === 'registrati' ? 'is-on' : ''} onClick={() => switchTab('registrati')}>
            Registrati
          </button>
        </div>

        <h1 className="h-title auth__title">{tab === 'accedi' ? 'Bentornato.' : 'Entra nella Lobby.'}</h1>
        <p className="muted">
          {tab === 'accedi' ? 'Riprendi da dove avevi lasciato.' : 'Un account gratuito per seguire i corsi e salvare i progressi.'}
        </p>

        {oauthError && !error && (
          <div className="alert" role="alert">
            {oauthError === 'access_denied'
              ? 'Accesso con Google annullato. Puoi riprovare o entrare con email e password.'
              : 'L’accesso con Google non è riuscito. Riprova tra poco o entra con email e password.'}
          </div>
        )}

        <form onSubmit={submit} noValidate className="form">
          {tab === 'registrati' && (
            <label className="field">
              <span>Nome</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" placeholder="Come ti chiami" />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="nome@email.it" />
          </label>
          <label className="field">
            <span>Password</span>
            <div className="field__pw">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={tab === 'accedi' ? 'current-password' : 'new-password'}
                placeholder={tab === 'registrati' ? 'Almeno 8 caratteri' : ''}
              />
              <button type="button" className="field__eye" onClick={() => setShow(!show)} aria-label={show ? 'Nascondi password' : 'Mostra password'}>
                {show ? <LuEyeOff /> : <LuEye />}
              </button>
            </div>
          </label>
          {tab === 'registrati' && (
            <label className="field">
              <span>Conferma password</span>
              <input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </label>
          )}

          {tab === 'registrati' && (
            <label className="check">
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
              <span>
                Ho almeno 14 anni, accetto i <a href="#/termini" target="_blank" rel="noopener">Termini di servizio</a> e ho letto
                l'<a href="#/privacy" target="_blank" rel="noopener">Informativa privacy</a>.
              </span>
            </label>
          )}

          {error && (
            <div className="alert" role="alert">
              {error.text}
            </div>
          )}

          <Button type="submit" block loading={busy}>
            {tab === 'accedi' ? 'Accedi' : 'Crea account'}
          </Button>

          {tab === 'accedi' && (
            <Link to="/password" className="link-quiet">
              Password dimenticata?
            </Link>
          )}

        </form>
        <GoogleButton />
      </div>
    </div>
  );
}
