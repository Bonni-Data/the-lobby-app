import React, { useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { auth, invoke, ApiError } from '../lib/api';
import { saveDisplayName, isFullName, saveAvatar, removeAvatar, squarePhoto, myEmailPrefs, setEmailPrefs, track, EmailPrefs } from '../lib/data';
import { InviteCard } from '../components/invite';
import { levelFor } from '../lib/game';
import { useGame } from '../components/game';
import { Button, Screen, TopBar, toast, useAsync } from '../components/ui';
import { navigate, Link } from '../lib/router';
import { APP_VERSION } from '../config';
import { canInstall, openInstall } from '../components/install';
import { LuLogOut, LuPencil, LuShieldCheck, LuFileText, LuMail, LuKeyRound, LuInbox, LuUser, LuDownload, LuTrash2, LuTrophy, LuUserPlus, LuShare2, LuCopy, LuCamera, LuSmartphone } from 'react-icons/lu';

export default function Profile() {
  const { session, displayName, setDisplayName, avatarUrl, setAvatarUrl, plan } = useAuth();
  const game = useGame();
  const level = game ? levelFor(game.xp) : null;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(displayName);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Scegli una foto (JPG, PNG o HEIC).');
    if (file.size > 20 * 1024 * 1024) return toast('La foto è troppo grande: massimo 20 MB.');
    setPhotoBusy(true);
    try {
      const url = await saveAvatar(await squarePhoto(file));
      setAvatarUrl(url);
      toast('Foto profilo aggiornata.');
    } catch {
      toast('Caricamento non riuscito. Prova con un’altra foto.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function dropPhoto() {
    setPhotoBusy(true);
    try {
      await removeAvatar();
      setAvatarUrl('');
      toast('Foto rimossa.');
    } catch {
      toast('Non sono riuscito a rimuovere la foto. Riprova.');
    } finally {
      setPhotoBusy(false);
    }
  }

  const initials = (displayName || session?.user?.email || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const full = name.trim().replace(/\s+/g, ' ');
    if (!isFullName(full)) return toast('Scrivi nome e cognome.');
    setBusy(true);
    try {
      await saveDisplayName(full);
      setDisplayName(full);
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
          <div className={`avatar-wrap ${photoBusy ? 'is-busy' : ''}`}>
            <span className={`avatar ${avatarUrl ? 'avatar--photo' : ''}`} aria-hidden="true">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
            </span>
            <button
              type="button"
              className="avatar-edit"
              onClick={() => fileRef.current?.click()}
              disabled={photoBusy}
              aria-label={avatarUrl ? 'Cambia la foto profilo' : 'Aggiungi una foto profilo'}
            >
              <LuCamera aria-hidden="true" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={pickPhoto} />
          </div>
          {editing ? (
            <form onSubmit={saveName} className="inline-form">
              <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome e cognome" placeholder="es. Rebecca Rossi" autoComplete="name" autoFocus />
              <Button type="submit" loading={busy}>Salva</Button>
            </form>
          ) : (
            <div>
              <h1 className="h-title">{displayName || 'Il tuo profilo'}</h1>
              <div className="profile-head__actions">
                <button className="link-quiet" onClick={() => { setName(displayName); setEditing(true); }}>
                  <LuPencil /> Modifica nome
                </button>
                <button className="link-quiet" onClick={() => fileRef.current?.click()} disabled={photoBusy}>
                  <LuCamera /> {photoBusy ? 'Carico la foto…' : avatarUrl ? 'Cambia foto' : 'Aggiungi foto'}
                </button>
                {avatarUrl && !photoBusy && (
                  <button className="link-quiet" onClick={dropPhoto}>
                    <LuTrash2 /> Rimuovi foto
                  </button>
                )}
              </div>
            </div>
          )}
          <p className="muted small"><LuMail /> {session?.user?.email}</p>
        </section>

        <section className="profile-stats">
          <div><strong>{game ? game.xp : '–'}</strong><span>XP</span></div>
          <div><strong>{game ? game.lessons : '–'}</strong><span>lezioni completate</span></div>
          <div><strong>{game ? game.streak : '–'}</strong><span>giorni di fila</span></div>
        </section>

        <InviteCard />

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
          {canInstall() && (
            <li>
              <button className="menu__link" onClick={openInstall}>
                <span><LuSmartphone /> Aggiungi alla schermata Home</span>
                <em>Aprila come un’app</em>
              </button>
            </li>
          )}
          <li><Link to="/andrea" className="menu__link"><span><LuUser /> Chi è Andrea?</span><em>La storia del founder</em></Link></li>
          <li><Link to="/privacy" className="menu__link"><span><LuShieldCheck /> Informativa privacy</span><em>Leggi</em></Link></li>
          <li><Link to="/termini" className="menu__link"><span><LuFileText /> Termini di servizio</span><em>Leggi</em></Link></li>
        </ul>

        <EmailSettings />

        <Button variant="secondary" block onClick={logout}>
          <LuLogOut /> Esci
        </Button>

        <MyData />

        <p className="tiny muted center">The Lobby Academy, versione {APP_VERSION}</p>
      </main>
    </Screen>
  );
}

/** Which engagement emails to receive. Service emails (password, live, Premium) always arrive. */
function EmailSettings() {
  const prefs = useAsync(() => myEmailPrefs(), []);
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState<EmailPrefs | null>(null);
  const cur = local || prefs.data || null;

  async function toggle(k: keyof EmailPrefs) {
    if (!cur) return;
    const nextPrefs = { ...cur, [k]: !cur[k] };
    setLocal(nextPrefs);
    setSaving(true);
    try {
      await setEmailPrefs(nextPrefs);
      toast(nextPrefs[k] ? 'Attivato.' : 'Disattivato.');
    } catch {
      setLocal(cur);
      toast('Salvataggio non riuscito.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mail-prefs" aria-label="Email che ricevi">
      <h2 className="h-section">Email che ricevi</h2>
      <label className="switch">
        <input type="checkbox" checked={!!cur?.digest} disabled={!cur || saving} onChange={() => toggle('digest')} />
        <span><strong>Riepilogo del lunedì</strong><small>Le opportunità della settimana e a che punto sei nel percorso.</small></span>
      </label>
      <label className="switch">
        <input type="checkbox" checked={!!cur?.reminders} disabled={!cur || saving} onChange={() => toggle('reminders')} />
        <span><strong>Promemoria</strong><small>La prima lezione, la serie di giorni di fila, un saluto se ti assenti a lungo.</small></span>
      </label>
      <p className="tiny muted">Le email di servizio (password, lezioni live, Premium) arrivano sempre.</p>
    </section>
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
