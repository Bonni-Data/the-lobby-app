import React, { useEffect, useState } from 'react';
import { LuSmartphone, LuX, LuShare, LuEllipsisVertical, LuSquarePlus } from 'react-icons/lu';
import { ArchMark, Button, toast } from './ui';
import { track } from '../lib/data';

/**
 * «Aggiungi alla schermata Home»: THE LOBBY is a web app, and once added to the home screen it opens full screen like an app.
 * - Chrome, Edge, Samsung Internet (Android and computer): the browser's own install prompt (beforeinstallprompt).
 * - iPhone and iPad: there is no prompt, so we show the two taps (Condividi → Aggiungi alla schermata Home).
 * - Instagram, Facebook and other in-app browsers cannot install: we explain how to open the page in the real browser.
 * Hidden when the app is already open from the home screen, and for 30 days after «Non ora».
 */

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

// Registered when the bundle loads, so the browser's early event is never missed.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    remember('installed');
    track('app_installed');
    notify();
  });
}

const KEY = 'thelobby.install';
const SNOOZE_DAYS = 30;

function remember(v: string) {
  try { localStorage.setItem(KEY, `${v}:${Date.now()}`); } catch { /* private mode */ }
}
function hiddenByChoice() {
  try {
    const [v, at] = (localStorage.getItem(KEY) || '').split(':');
    if (v === 'installed') return true;
    return v === 'later' && Date.now() - Number(at) < SNOOZE_DAYS * 86400000;
  } catch {
    return false;
  }
}

function standalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

type Kind = 'prompt' | 'ios' | 'android' | 'inapp' | null;

function detect(): Kind {
  const ua = navigator.userAgent || '';
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inApp = /Instagram|FBAN|FBAV|FB_IAB|Messenger|LinkedInApp|TikTok|musical_ly|Line\//i.test(ua);
  if (inApp) return 'inapp';
  if (deferred) return 'prompt';
  if (ios) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return null; // a computer without an install prompt: nothing useful to offer
}

export function InstallCard() {
  const [kind, setKind] = useState<Kind>(() => (standalone() || hiddenByChoice() ? null : detect()));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const update = () => setKind(standalone() || hiddenByChoice() ? null : detect());
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  if (!kind) return null;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const phone = ios || /android|mobile/i.test(navigator.userAgent);

  async function add() {
    track('install_click');
    if (kind === 'prompt' && deferred) {
      const p = deferred;
      deferred = null;
      try {
        await p.prompt();
        const choice = await p.userChoice;
        if (choice.outcome === 'accepted') {
          remember('installed');
          toast(phone ? 'Fatto: trovi THE LOBBY nella schermata Home.' : 'Fatto: THE LOBBY ora si apre come un’app.');
        }
      } catch { /* the browser refused */ }
      setKind(standalone() || hiddenByChoice() ? null : detect());
      return;
    }
    setOpen(true);
  }

  function later() {
    remember('later');
    setOpen(false);
    setKind(null);
  }

  return (
    <section className="install" aria-label="Aggiungi THE LOBBY alla schermata Home">
      <button className="install__close iconbtn" onClick={later} aria-label="Non ora"><LuX aria-hidden="true" /></button>
      <span className="install__icon" aria-hidden="true"><ArchMark size={20} /></span>
      <div className="install__body">
        <strong className="install__title">{phone ? 'Metti THE LOBBY sul telefono' : 'Installa THE LOBBY sul computer'}</strong>
        <span className="install__text">{phone
          ? 'Aggiungila alla schermata Home: la apri con un tocco, a schermo intero, come un’app.'
          : 'Aggiungila come app: la apri con un clic, nella sua finestra. Dal telefono puoi metterla nella schermata Home.'}</span>
        {!open && (
          <Button onClick={add}><LuSmartphone aria-hidden="true" /> {phone ? 'Aggiungi alla Home' : 'Installa l’app'}</Button>
        )}
        {open && kind === 'ios' && (
          <ol className="install__steps">
            <li><LuShare aria-hidden="true" /><span>Tocca <strong>Condividi</strong>, il quadrato con la freccia in basso (o in alto, su iPad).</span></li>
            <li><LuSquarePlus aria-hidden="true" /><span>Scorri e scegli <strong>Aggiungi alla schermata Home</strong>, poi <strong>Aggiungi</strong>.</span></li>
          </ol>
        )}
        {open && kind === 'android' && (
          <ol className="install__steps">
            <li><LuEllipsisVertical aria-hidden="true" /><span>Apri il <strong>menu del browser</strong>, i tre puntini in alto a destra.</span></li>
            <li><LuSquarePlus aria-hidden="true" /><span>Scegli <strong>Installa app</strong> o <strong>Aggiungi a schermata Home</strong>.</span></li>
          </ol>
        )}
        {open && kind === 'inapp' && (
          <ol className="install__steps">
            <li><LuEllipsisVertical aria-hidden="true" /><span>Da qui non si può: tocca i <strong>tre puntini</strong> in alto a destra e scegli <strong>Apri nel browser</strong> (a volte si chiama «Apri in {ios ? 'Safari' : 'Chrome'}»).</span></li>
            <li><LuSquarePlus aria-hidden="true" /><span>Nel browser torna in Home e tocca di nuovo <strong>Aggiungi alla schermata Home</strong>.</span></li>
          </ol>
        )}
      </div>
    </section>
  );
}
