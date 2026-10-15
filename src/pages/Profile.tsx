import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { auth, invoke, ApiError } from '../lib/api';
import { saveDisplayName } from '../lib/data';
import { levelFor } from '../lib/game';
import { useGame } from '../components/game';
import { Button, Screen, TopBar, toast } from '../components/ui';
import { navigate, Link } from '../lib/router';
import { APP_VERSION } from '../config';
import { LuLogOut, LuPencil, LuShieldCheck, LuFileText, LuMail, LuKeyRound, LuInbox, LuUser, LuDownload, LuTrash2, LuTrophy } from 'react-icons/lu';

export default function Profile() {
  const { session, displayName, setDisplayName, plan } = useAuth();
  const game = useGame();
  const level = game ? levelFor(game.xp) : null;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(displayName);
  const [busy, setBusy] = useState(false);

  const initials = (displayName || session?.user?.email || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setBusy(true);
    try {
      await saveDisplayName(name.trim());
      setDisplayName(name.trim());
      setEditing(false);
      toast('Nome aggiornato.');
    } catch {
      toast('Salvataggio non riuscito.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await auth.signOut();
    navigate('/', true);
  }

  return (
    <Screen>
      <TopBar />
      <main className="page">
        <section className="profile-head">
          <span className="avatar" aria-hidden="true">{initials}</span>
          {editing ? (
            <form onSubmit={saveName} className="inline-form">
              <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Il tuo nome" autoFocus />
              <Button type="submit" loading={busy}>Salva</Button>
            </form>
          ) : (
            <div>
              <h1 className="h-title">{displayName || 'Il tuo profilo'}</h1>
              <button className="link-quiet" onClick={() => { setName(displayName); setEditing(true); }}>
                <LuPencil /> Modifica nome
              </button>
            </div>
          )}
          <p className="muted small"><LuMail /> {session?.user?.email}</p>
        </section>

        <section className="profile-stats">
          <div><strong>{game ? game.xp : '–'}</strong><span>XP</span></div>
          <div><strong>{game ? game.lessons : '–'}</strong><span>lezioni completate</span></div>
          <div><strong>{game ? game.streak : '–'}</strong><span>giorni di fila</span></div>
        </section>

        <ul className="menu">
          <li>
            <Link to="/traguardi" className="menu__link">
              <span><LuTrophy /> Traguardi e certificati</span>
              <em className="is-premium">{level ? `${level.name} · ${game!.badges.length} traguardi` : 'Livelli, serie, certificati'}</em>
            </Link>
          </li>
          <li>
            <Link to="/premium" className="menu__link">
              <span><LuKeyRound /> Piano</span>
              <em className={plan.premium ? 'is-premium' : ''}>
                {plan.premium ? 'Premium' : plan.application?.status === 'pending' ? 'Free · candidatura in valutazione' : 'Free · candidati a Premium'}
              </em>
            </Link>
          </li>
          {plan.admin && (
            <li>
              <Link to="/admin" className="menu__link">
                <span><LuInbox /> Area founder</span>
                <em className="is-premium">Candidature e cene</em>
              </Link>
            </li>
          )}
          <li><Link to="/andrea" className="menu__link"><span><LuUser /> Chi è Andrea</span><em>La storia del founder</em></Link></li>
          <li><Link to="/privacy" className="menu__link"><span><LuShieldCheck /> Informativa privacy</span><em>Leggi</em></Link></li>
          <li><Link to="/termini" className="menu__link"><span><LuFileText /> Termini di servizio</span><em>Leggi</em></Link></li>
        </ul>

        <Button variant="secondary" block onClick={logout}>
          <LuLogOut /> Esci
        </Button>

        <MyData />

        <p className="tiny muted center">The Lobby Academy, versione {APP_VERSION}</p>
      </main>
    </Screen>
  );
}

/** GDPR self-service: a copy of your data, or delete the account. */
function MyData() {
  const [busy, setBusy] = useState<'' | 'export' | 'delete'>('');
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');

  async function download() {
    setBusy('export');
    try {
      const data = await invoke('account', { action: 'export' });
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'the-lobby-i-miei-dati.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast('Download non riuscito. Riprova.');
    } finally {
      setBusy('');
    }
  }

  async function remove() {
    setBusy('delete');
    try {
      await invoke('account', { action: 'delete', confirm: word.trim().toUpperCase() });
      await auth.signOut();
      toast('Account eliminato. Grazie per essere passato dalla Lobby.');
      navigate('/', true);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : '';
      toast(code === 'founder_account' ? 'L’account del founder non si elimina da qui.' : 'Eliminazione non riuscita. Riprova o scrivici.');
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="mydata" aria-label="I tuoi dati">
      <h2 className="h-section">I tuoi dati</h2>
      <button className="link-quiet" onClick={download} disabled={!!busy}><LuDownload aria-hidden="true" /> {busy === 'export' ? 'Preparo il file…' : 'Scarica una copia dei miei dati'}</button>
      {!open ? (
        <button className="link-quiet mydata__danger" onClick={() => setOpen(true)}><LuTrash2 aria-hidden="true" /> Elimina il mio account</button>
      ) : (
        <div className="mydata__confirm">
          <p>Eliminiamo account, progressi, quiz, candidatura e prenotazioni. Non si può annullare. Scrivi <strong>ELIMINA</strong> per confermare.</p>
          <input value={word} onChange={(e) => setWord(e.target.value)} aria-label="Scrivi ELIMINA per confermare" autoCapitalize="characters" />
          <div className="mydata__btns">
            <Button variant="secondary" onClick={remove} loading={busy === 'delete'} disabled={word.trim().toUpperCase() !== 'ELIMINA'}>Elimina per sempre</Button>
            <Button variant="ghost" onClick={() => { setOpen(false); setWord(''); }} disabled={!!busy}>Annulla</Button>
          </div>
        </div>
      )}
    </section>
  );
}
