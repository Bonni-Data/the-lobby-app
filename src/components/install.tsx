import React, { useEffect, useRef, useState } from 'react';
import { LuSmartphone, LuX, LuShare, LuEllipsisVertical, LuSquarePlus } from 'react-icons/lu';
import { Button, toast } from './ui';
import { track } from '../lib/data';
import { useLocation } from '../lib/router';

/**
 * «Aggiungi alla schermata Home» pop-up. THE LOBBY is a web app: once added to the home screen it opens full screen like an app.
 * It appears by itself after the first 5 minutes of use (time with the app on screen, added up across visits), or on demand
 * from the Profile. Never on top of a quiz or a simulation, and never when the app is already open from the home screen.
 * - Chrome, Edge, Samsung Internet (Android and computer): the browser's own install prompt (beforeinstallprompt).
 * - iPhone and iPad: there is no prompt, so we show the two taps (Condividi → Aggiungi alla schermata Home).
 * - Instagram, Facebook and other in-app browsers cannot install: we explain how to open the page in the real browser.
 * «Non ora» hides it for 30 days.
 */

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

const KEY = 'thelobby.install';
const USAGE_KEY = 'thelobby.usage';
const AFTER_SECONDS = 5 * 60;
const TICK_SECONDS = 5;
const SNOOZE_DAYS = 30;

let deferred: InstallPromptEvent | null = null;
let usage = readUsage();
let ready = usage >= AFTER_SECONDS;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function readUsage() {
  try { return Number(localStorage.getItem(USAGE_KEY)) || 0; } catch { return 0; }
}

// Registered when the bundle loads, so the browser's early event is never missed.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    remember('installed');
    track('app_installed');
    notify();
  });
  // Minutes of use: counted only while the app is on screen, kept across visits.
  window.setInterval(() => {
    if (document.visibilityState !== 'visible' || usage >= AFTER_SECONDS) return;
    usage += TICK_SECONDS;
    try { localStorage.setItem(USAGE_KEY, String(usage)); } catch { /* private mode: counts this visit only */ }
    if (usage >= AFTER_SECONDS) { ready = true; notify(); }
  }, TICK_SECONDS * 1000);
}

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
function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function isPhone() {
  return isIos() || /android|mobile/i.test(navigator.userAgent);
}

type Kind = 'prompt' | 'ios' | 'android' | 'inapp' | null;

function detect(): Kind {
  if (standalone()) return null;
  const ua = navigator.userAgent || '';
  if (/Instagram|FBAN|FBAV|FB_IAB|Messenger|LinkedInApp|TikTok|musical_ly|Line\//i.test(ua)) return 'inapp';
  if (deferred) return 'prompt';
  if (isIos()) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return null; // a computer without an install prompt: nothing useful to offer
}

/** For the Profile menu: can this device add THE LOBBY to its home screen right now? */
export function canInstall() {
  return detect() !== null;
}

/** Opens the pop-up on demand (Profile menu). */
export function openInstall() {
  window.dispatchEvent(new Event('thelobby:install'));
}

export function InstallPrompt() {
  const { path } = useLocation();
  const [, rerender] = useState(0);
  const [open, setOpen] = useState(false);
  const shownAuto = useRef(false);
  const kind = detect();
  const busyPage = path.startsWith('/quiz/') || path.startsWith('/simulazione/');

  useEffect(() => {
    const update = () => rerender((n) => n + 1);
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  useEffect(() => {
    const onDemand = () => { if (detect()) setOpen(true); };
    window.addEventListener('thelobby:install', onDemand);
    return () => window.removeEventListener('thelobby:install', onDemand);
  }, []);

  // The automatic appearance, once the first 5 minutes are up.
  useEffect(() => {
    if (open || shownAuto.current || !ready || !kind || busyPage || hiddenByChoice()) return;
    if (document.querySelector('.levelup')) return; // let the level-up celebration finish first
    shownAuto.current = true;
    setOpen(true);
    track('install_prompt');
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && later();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open || !kind) return null;
  const phone = isPhone();

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
        } else {
          remember('later');
        }
      } catch { /* the browser refused */ }
      setOpen(false);
      return;
    }
    remember('later');
    setOpen(false);
  }

  function later() {
    remember('later');
    setOpen(false);
  }

  return (
    <div className="install-pop" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={later}>
      <div className="install-pop__card" onClick={(e) => e.stopPropagation()}>
        <button className="install-pop__close" onClick={later} aria-label="Chiudi"><LuX aria-hidden="true" /></button>
        <img className="install-pop__icon" src="./icons/icon-192.png" alt="" width={64} height={64} />
        <h2 id="install-title" className="install-pop__title">{phone ? 'Porta THE LOBBY sul telefono' : 'Installa THE LOBBY sul computer'}</h2>
        <p className="install-pop__text">
          {phone
            ? 'Aggiungila alla schermata Home: la apri con un tocco, a schermo intero, come un’app. Niente download dallo store.'
            : 'Aggiungila come app: la apri con un clic, nella sua finestra. Dal telefono puoi metterla nella schermata Home.'}
        </p>
        {kind === 'ios' && (
          <ol className="install-pop__steps">
            <li><LuShare aria-hidden="true" /><span>Tocca <strong>Condividi</strong>, il quadrato con la freccia in basso (o in alto, su iPad).</span></li>
            <li><LuSquarePlus aria-hidden="true" /><span>Scorri e scegli <strong>Aggiungi alla schermata Home</strong>, poi <strong>Aggiungi</strong>.</span></li>
          </ol>
        )}
        {kind === 'android' && (
          <ol className="install-pop__steps">
            <li><LuEllipsisVertical aria-hidden="true" /><span>Apri il <strong>menu del browser</strong>, i tre puntini in alto a destra.</span></li>
            <li><LuSquarePlus aria-hidden="true" /><span>Scegli <strong>Installa app</strong> o <strong>Aggiungi a schermata Home</strong>.</span></li>
          </ol>
        )}
        {kind === 'inapp' && (
          <ol className="install-pop__steps">
            <li><LuEllipsisVertical aria-hidden="true" /><span>Da qui non si può: tocca i <strong>tre puntini</strong> in alto a destra e scegli <strong>Apri nel browser</strong> (a volte si chiama «Apri in {isIos() ? 'Safari' : 'Chrome'}»).</span></li>
            <li><LuSquarePlus aria-hidden="true" /><span>Nel browser apri il tuo Profilo e tocca <strong>Aggiungi alla schermata Home</strong>.</span></li>
          </ol>
        )}
        <Button block onClick={add} autoFocus>
          {kind === 'prompt' ? <><LuSmartphone aria-hidden="true" /> {phone ? 'Aggiungi alla Home' : 'Installa l’app'}</> : 'Ok, ho capito'}
        </Button>
        <button className="install-pop__later" onClick={later}>Non ora</button>
      </div>
    </div>
  );
}
