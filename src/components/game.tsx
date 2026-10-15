import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { Link } from '../lib/router';
import { BADGES, LEVELS, Stats, gameStats, levelFor, loadGame, onGame, onGameEvent, resetGame } from '../lib/game';
import { Button } from './ui';
import {
  LuDoorOpen, LuBookOpen, LuAward, LuMedal, LuTarget, LuCrosshair, LuEye, LuFlame, LuSwords, LuCrown, LuLandmark, LuGlobe, LuMic, LuKeyRound, LuLock, LuArrowRight, LuZap,
} from 'react-icons/lu';

const ICONS: Record<string, React.ReactNode> = {
  door: <LuDoorOpen />, book: <LuBookOpen />, award: <LuAward />, medal: <LuMedal />, target: <LuTarget />, crosshair: <LuCrosshair />,
  eye: <LuEye />, flame: <LuFlame />, swords: <LuSwords />, chess: <LuCrown />, landmark: <LuLandmark />, globe: <LuGlobe />, mic: <LuMic />, key: <LuKeyRound />,
};

export function badgeInfo(id: string) {
  return BADGES.find((b) => b.id === id);
}

/** Live view of the member's XP, level, streak and badges. */
export function useGame(): Stats | null {
  const { session } = useAuth();
  const [s, setS] = useState<Stats | null>(gameStats());
  useEffect(() => {
    if (!session) return;
    const off = onGame(setS);
    loadGame().then((x) => x && setS(x));
    return off;
  }, [session?.user?.id]);
  return session ? s : null;
}

/* ---------- Celebrations: +XP pop, new level, new badge ---------- */

export function GameHost() {
  const { session } = useAuth();
  const [pop, setPop] = useState<{ id: number; amount: number } | null>(null);
  const [level, setLevel] = useState<ReturnType<typeof levelFor> | null>(null);
  const [badge, setBadge] = useState<string | null>(null);

  // Different member signed in: start from their numbers.
  useEffect(() => {
    resetGame();
    if (session) loadGame();
  }, [session?.user?.id]);

  useEffect(() => {
    let n = 0;
    let popTimer: any;
    const timers: any[] = [];
    const off = onGameEvent((e) => {
      if (e.kind === 'xp') {
        // Gains close together add up in a single pop instead of stacking.
        const id = ++n;
        setPop((p) => ({ id, amount: (p ? p.amount : 0) + e.amount }));
        clearTimeout(popTimer);
        popTimer = setTimeout(() => setPop(null), 2200);
      } else if (e.kind === 'level') {
        timers.push(setTimeout(() => setLevel(e.level), 700));
      } else if (e.kind === 'badge') {
        timers.push(setTimeout(() => setBadge(e.id), 900));
      }
    });
    return () => { off(); clearTimeout(popTimer); timers.forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    if (!badge) return;
    const t = setTimeout(() => setBadge(null), 4200);
    return () => clearTimeout(t);
  }, [badge]);

  const b = badge ? badgeInfo(badge) : null;
  return (
    <>
      <div className="xp-pops" aria-live="polite">
        {pop && <span key={pop.id} className="xp-pop"><LuZap aria-hidden="true" /> +{pop.amount} XP</span>}
      </div>
      {b && (
        <div className="badge-toast" role="status">
          <span className="badge-toast__icon" aria-hidden="true">{ICONS[b.icon]}</span>
          <span><small>Traguardo sbloccato</small><strong>{b.name}</strong></span>
        </div>
      )}
      {level && <LevelUp level={level} onClose={() => setLevel(null)} />}
    </>
  );
}

function LevelUp({ level, onClose }: { level: ReturnType<typeof levelFor>; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="levelup" role="dialog" aria-modal="true" aria-labelledby="levelup-title" onClick={onClose}>
      <div className="levelup__card" onClick={(e) => e.stopPropagation()}>
        <div className="levelup__arches" aria-hidden="true"><span /><span /><span /></div>
        <span className="levelup__kicker">Nuovo livello · {level.number} di {LEVELS.length}</span>
        <h2 id="levelup-title" className="levelup__name">{level.name}</h2>
        <p className="levelup__line">{level.line}</p>
        {level.next && <p className="levelup__next">Prossimo gradino: <strong>{level.next.name}</strong></p>}
        <Button variant="primary" block onClick={onClose} autoFocus>Continua</Button>
      </div>
    </div>
  );
}

/* ---------- Pieces used by Home, Profile and the Traguardi page ---------- */

export function StreakFlame({ s, compact }: { s: Stats; compact?: boolean }) {
  return (
    <span className={`streak ${s.active_today ? 'is-on' : ''} ${compact ? 'streak--compact' : ''}`} title="Giorni di fila in cui hai imparato qualcosa">
      <LuFlame aria-hidden="true" />
      <strong>{s.streak}</strong>
      <span>{s.streak === 1 ? 'giorno' : 'giorni'}{compact ? '' : ' di fila'}</span>
    </span>
  );
}

/** Home: level, XP to the next step, streak and the last badges. */
export function LevelCard() {
  const s = useGame();
  if (!s) return null;
  const l = levelFor(s.xp);
  const recent = [...s.badges].sort((a, b) => (b.at || '').localeCompare(a.at || '')).slice(0, 4);
  return (
    <Link to="/traguardi" className="levelcard" aria-label={`Livello ${l.number}: ${l.name}. ${s.xp} XP. Apri i traguardi`}>
      <div className="levelcard__top">
        <span className="levelcard__n" aria-hidden="true">{l.number}</span>
        <div className="levelcard__who">
          <small>Il tuo livello</small>
          <strong>{l.name}</strong>
        </div>
        <StreakFlame s={s} compact />
      </div>
      <div className="xpbar" aria-hidden="true"><span style={{ width: `${Math.round(l.progress * 100)}%` }} /></div>
      <div className="levelcard__meta">
        <span><strong>{s.xp}</strong> XP</span>
        <span>{l.next ? <>ancora {l.toNext} per <b>{l.next.name}</b></> : 'Livello massimo raggiunto'}</span>
      </div>
      <p className="levelcard__nudge">
        {s.active_today
          ? 'Oggi hai già imparato qualcosa: la serie è salva.'
          : s.streak > 0
            ? `Completa una lezione oggi per portare la serie a ${s.streak + 1} giorni.`
            : 'Completa una lezione oggi e inizia la tua serie.'}
      </p>
      {recent.length > 0 && (
        <span className="levelcard__badges">
          {recent.map((b) => {
            const info = badgeInfo(b.id);
            return info ? <span key={b.id} className="mini-badge" title={info.name}>{ICONS[info.icon]}</span> : null;
          })}
          <span className="levelcard__go">Traguardi <LuArrowRight aria-hidden="true" /></span>
        </span>
      )}
    </Link>
  );
}

export function BadgeGrid({ s }: { s: Stats }) {
  const got = new Map(s.badges.map((b) => [b.id, b]));
  return (
    <ul className="badges">
      {BADGES.map((b) => {
        const has = got.get(b.id);
        return (
          <li key={b.id} className={has ? 'is-on' : ''}>
            <span className="badge__icon" aria-hidden="true">{has ? ICONS[b.icon] : <LuLock />}</span>
            <strong>{b.name}</strong>
            <span>{b.text}</span>
            <span className="sr-only">{has ? 'Ottenuto' : 'Da sbloccare'}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function LevelLadder({ xp }: { xp: number }) {
  const cur = levelFor(xp);
  return (
    <ol className="ladder">
      {LEVELS.map((l, i) => (
        <li key={l.name} className={i < cur.index ? 'is-past' : i === cur.index ? 'is-now' : ''}>
          <span className="ladder__n">{i + 1}</span>
          <span className="ladder__name">{l.name}</span>
          <span className="ladder__xp">{l.xp} XP</span>
        </li>
      ))}
    </ol>
  );
}
