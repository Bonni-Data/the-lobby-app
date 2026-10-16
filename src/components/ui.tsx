import React, { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from '../lib/router';
import { useAuth } from '../lib/auth';
import { LuHouse, LuLibrary, LuCompass, LuUser, LuArrowLeft, LuWifiOff, LuKeyRound } from 'react-icons/lu';

/* ---------- Brand ---------- */

/** The arch: the brand's threshold symbol. */
export function ArchMark({ size = 40, tone = 'coral' }: { size?: number; tone?: 'coral' | 'ivory' | 'navy' }) {
  const color = tone === 'coral' ? 'var(--coral)' : tone === 'ivory' ? 'var(--ivory)' : 'var(--navy)';
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 40 48" aria-hidden="true">
      <path d="M4 46V20a16 16 0 0 1 32 0v26" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <path d="M14 46V24a6 6 0 0 1 12 0v22" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

export function Wordmark({ tone = 'navy', size = 22 }: { tone?: 'navy' | 'ivory'; size?: number }) {
  return (
    <span className={`wordmark wordmark--${tone}`} style={{ fontSize: size }} aria-label="The Lobby">
      THE LOBBY
    </span>
  );
}

/* ---------- Arch progress: progress drawn along the outline of a doorway ---------- */
export function ArchProgress({ value, size = 56, label }: { value: number; size?: number; label?: string }) {
  const w = 40;
  const h = 48;
  const r = 16;
  const pad = 4;
  const len = 2 * (h - pad - (r + pad)) + Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const d = `M${pad} ${h - pad}V${r + pad}a${r} ${r} 0 0 1 ${2 * r} 0V${h - pad}`;
  return (
    <div className="arch-progress" style={{ width: size, height: size * 1.2 }} role="img" aria-label={label || `${Math.round(pct * 100)}% completato`}>
      <svg viewBox={`0 0 ${w} ${h}`} width={size} height={size * 1.2}>
        <path d={d} fill="none" stroke="var(--line)" strokeWidth="4" strokeLinecap="round" />
        <path
          d={d}
          fill="none"
          stroke="var(--coral)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - pct)}
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <span className="arch-progress__num">{Math.round(pct * 100)}<small>%</small></span>
    </div>
  );
}

/** Course cover: white card with the coral arch logo (light and welcoming, never a dark slab). */
export function DoorCover({ title, level, small }: { title: string; level?: string; small?: boolean }) {
  if (small) {
    return (
      <div className="cover cover--small" aria-hidden="true">
        <ArchMark size={22} />
      </div>
    );
  }
  return (
    <div className="cover">
      <span className="cover__mark"><ArchMark size={30} /></span>
      {level && <span className="cover__label">{level}</span>}
      <span className="cover__title">{title}</span>
    </div>
  );
}

/* ---------- Layout ---------- */

export function TabBar() {
  const { path } = useLocation();
  const { avatarUrl } = useAuth();
  const items = [
    { to: '/home', label: 'Home', icon: <LuHouse />, active: path === '/home' || path === '/' },
    { to: '/academy', label: 'Academy', icon: <LuLibrary />, active: path.startsWith('/academy') || path.startsWith('/corso') || path.startsWith('/lezione') || path.startsWith('/quiz') },
    { to: '/opportunita', label: 'Opportunità', icon: <LuCompass />, active: path.startsWith('/opportunita') },
    { to: '/premium', label: 'Premium', icon: <LuKeyRound />, active: path.startsWith('/premium') },
    { to: '/profilo', label: 'Profilo', icon: avatarUrl ? <img className="tabbar__avatar" src={avatarUrl} alt="" /> : <LuUser />, active: path.startsWith('/profilo') },
  ];
  return (
    <nav className="tabbar" aria-label="Navigazione principale">
      <Link to="/home" className="tabbar__brand" aria-label="THE LOBBY, Home">
        <ArchMark size={22} />
        <Wordmark size={20} />
      </Link>
      {items.map((i) => (
        <Link key={i.to} to={i.to} className={`tabbar__item ${i.active ? 'is-active' : ''}`} aria-current={i.active ? 'page' : undefined}>
          <span className="tabbar__icon">{i.icon}</span>
          <span className="tabbar__label">{i.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function TopBar({ title, back, right }: { title?: string; back?: string; right?: React.ReactNode }) {
  return (
    <header className="topbar">
      {back ? (
        <Link to={back} className="iconbtn" aria-label="Indietro">
          <LuArrowLeft />
        </Link>
      ) : (
        <span className="topbar__brand">
          <ArchMark size={18} />
          <Wordmark size={18} />
        </span>
      )}
      {title && <span className="topbar__title">{title}</span>}
      <span className="topbar__right">{right}</span>
    </header>
  );
}

const REVEAL =
  '.feature, .opp-card, .pinned, .course-row, .timeline li, .dinner, .preview, .press li, .learned li, .steps li, .story-stats li, ' +
  '.perks li, .pillars li, .founder, .founder-box, .letter, .why, .teaser, .nudge, .premium-close, .academy-premium, .event, .appcard, ' +
  '.resume, .quote, .block__head, .door-card, .faq details, .cmp, .lesson-text > *';

/** Fade-up elements as they scroll into view (re-scans when async content arrives). */
export function useReveal(root: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    const scan = () => {
      el.querySelectorAll<HTMLElement>(REVEAL).forEach((n) => {
        if (n.dataset.rv) return;
        n.dataset.rv = '1';
        const sibs = n.parentElement ? Array.from(n.parentElement.children) : [];
        n.style.setProperty('--rv-delay', `${Math.min(sibs.indexOf(n), 5) * 70}ms`);
        n.classList.add('reveal');
        io.observe(n);
      });
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(el, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}

export function Screen({ children, nav = true, className = '' }: { children: React.ReactNode; nav?: boolean; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useReveal(ref);
  return (
    <div ref={ref} className={`screen ${nav ? 'screen--nav' : ''} ${className}`}>
      {children}
      {nav && <TabBar />}
    </div>
  );
}

/* ---------- Primitives ---------- */

export function Button({
  children,
  variant = 'primary',
  loading,
  block,
  ...rest
}: { variant?: 'primary' | 'secondary' | 'ghost' | 'light'; loading?: boolean; block?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`btn btn--${variant} ${block ? 'btn--block' : ''}`} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="spinner spinner--sm" aria-label="Caricamento" /> : children}
    </button>
  );
}

export function ButtonLink({ to, children, variant = 'primary', block }: { to: string; children: React.ReactNode; variant?: string; block?: boolean }) {
  return (
    <Link to={to} className={`btn btn--${variant} ${block ? 'btn--block' : ''}`}>
      {children}
    </Link>
  );
}

export function Spinner({ label = 'Caricamento' }: { label?: string }) {
  return (
    <div className="center-state" role="status">
      <span className="spinner" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="center-state">
      <LuWifiOff size={28} />
      <p>{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Riprova
        </Button>
      )}
    </div>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <ArchMark size={34} tone="navy" />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

/* ---------- Toast ---------- */
let pushToast: (m: string) => void = () => {};
export function toast(message: string) {
  pushToast(message);
}
export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: any;
    pushToast = (m) => {
      setMsg(m);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 3600);
    };
    return () => clearTimeout(t);
  }, []);
  return (
    <div className={`toast ${msg ? 'is-visible' : ''}`} role="status" aria-live="polite">
      {msg}
    </div>
  );
}

/* ---------- Async helper ---------- */
export function useAsync<T>(fn: () => Promise<T>, deps: any[] = []) {
  const [state, setState] = useState<{ loading: boolean; data?: T; error?: string }>({ loading: true });
  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fn()
      .then((data) => setState({ loading: false, data }))
      .catch((e) => setState({ loading: false, error: e?.message || 'Qualcosa non ha funzionato.' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(run, [run]);
  return { ...state, reload: run };
}

export function formatMinutes(seconds?: number | null) {
  const m = Math.max(1, Math.round((seconds || 0) / 60));
  return `${m} min`;
}

export function formatDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Number that counts up the first time it scrolls into view. */
export function CountUp({ to, duration = 1100 }: { to: number; duration?: number }) {
  const [n, setN] = useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') { setN(to); return; }
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return <span ref={ref}>{n}</span>;
}

/** Endless horizontal ticker. */
export function Ticker({ label, items }: { label: string; items: React.ReactNode[] }) {
  if (items.length === 0) return null;
  const row = items.map((it, i) => <span className="ticker__item" key={i}>{it}</span>);
  return (
    <div className="ticker" aria-label={label}>
      <span className="ticker__label">{label}</span>
      <div className="ticker__viewport">
        <div className="ticker__track">
          {row}
          <span aria-hidden="true" className="ticker__dup">{items.map((it, i) => <span className="ticker__item" key={i}>{it}</span>)}</span>
        </div>
      </div>
    </div>
  );
}
