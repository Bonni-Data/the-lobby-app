import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { auth } from '../lib/api';
import { listProgress, listAttempts, saveDisplayName } from '../lib/data';
import { Button, Screen, TopBar, useAsync, toast } from '../components/ui';
import { navigate, Link } from '../lib/router';
import { APP_VERSION } from '../config';
import { LuLogOut, LuPencil, LuShieldCheck, LuFileText, LuMail, LuKeyRound } from 'react-icons/lu';

export default function Profile() {
  const { session, displayName, setDisplayName, plan } = useAuth();
  const stats = useAsync(async () => {
    const [p, a] = await Promise.all([listProgress(), listAttempts()]);
    const best = a.reduce((m, x) => Math.max(m, x.max_score ? x.score / x.max_score : 0), 0);
    return { lessons: p.filter((x) => x.status === 'completed').length, quizzes: a.length, best };
  }, []);
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
          <div><strong>{stats.data?.lessons ?? '–'}</strong><span>lezioni completate</span></div>
          <div><strong>{stats.data?.quizzes ?? '–'}</strong><span>quiz svolti</span></div>
          <div><strong>{stats.data ? `${Math.round(stats.data.best * 100)}%` : '–'}</strong><span>miglior quiz</span></div>
        </section>

        <ul className="menu">
          <li>
            <Link to="/premium" className="menu__link">
              <span><LuKeyRound /> Piano</span>
              <em className={plan.premium ? 'is-premium' : ''}>{plan.premium ? 'Premium' : plan.waitlist ? 'Free · in lista Premium' : 'Free · scopri Premium'}</em>
            </Link>
          </li>
          <li><span><LuShieldCheck /> Informativa privacy</span><em>in preparazione</em></li>
          <li><span><LuFileText /> Termini di servizio</span><em>in preparazione</em></li>
        </ul>

        <Button variant="secondary" block onClick={logout}>
          <LuLogOut /> Esci
        </Button>

        <p className="tiny muted center">The Lobby Academy, versione {APP_VERSION}</p>
      </main>
    </Screen>
  );
}
