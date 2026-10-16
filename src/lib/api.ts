// Minimal Supabase client (Auth + PostgREST) built on fetch, no dependencies.
import { SUPABASE_URL, SUPABASE_ANON_KEY, TERMS_VERSION } from '../config';

export type User = { id: string; email: string; user_metadata?: Record<string, any> };
export type Session = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch seconds
  user: User;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const STORAGE_KEY = 'thelobby.session';
type Listener = (s: Session | null) => void;

let session: Session | null = load();
const listeners = new Set<Listener>();
let refreshing: Promise<Session | null> | null = null;

function load(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function save(s: Session | null) {
  session = s;
  try {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable: keep in memory */
  }
  listeners.forEach((l) => l(s));
}

export function onSession(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function currentSession() {
  return session;
}

function toSession(body: any): Session | null {
  if (!body?.access_token) return null;
  const expires_at = body.expires_at ?? Math.floor(Date.now() / 1000) + (body.expires_in ?? 3600);
  return { access_token: body.access_token, refresh_token: body.refresh_token, expires_at, user: body.user };
}

async function parse(res: Response) {
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg = body?.msg || body?.message || body?.error_description || body?.error || `Errore ${res.status}`;
    const code = body?.error_code || body?.code || body?.error;
    throw new ApiError(String(msg), res.status, code);
  }
  return body;
}

async function raw(path: string, init: RequestInit = {}, token?: string | null) {
  const headers = new Headers(init.headers);
  headers.set('apikey', SUPABASE_ANON_KEY);
  headers.set('Authorization', `Bearer ${token || SUPABASE_ANON_KEY}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError('Connessione assente. Controlla la rete e riprova.', 0, 'network');
  }
  return parse(res);
}

async function validToken(): Promise<string | null> {
  if (!session) return null;
  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at - now > 60) return session.access_token;
  const s = await refresh();
  return s?.access_token ?? null;
}

export function refresh(): Promise<Session | null> {
  if (!session) return Promise.resolve(null);
  if (!refreshing) {
    const rt = session.refresh_token;
    refreshing = raw('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: rt }),
    })
      .then((b) => {
        const s = toSession(b);
        save(s);
        return s;
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status >= 400 && e.status < 500) save(null);
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

// ---------- Where new members come from (utm_* in the link of the ad) ----------
// Read from the address bar at signup time only: nothing is stored on the device for this.
export function signupSource(): Record<string, string> {
  try {
    const q = new URLSearchParams(window.location.search);
    const out: Record<string, string> = {};
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) {
      const v = q.get(k);
      if (v) out[k] = v.slice(0, 80);
    }
    // Invite code of the friend who shared the link (?invito=ABC123).
    const invite = (q.get('invito') || '').trim().toUpperCase();
    if (/^[A-Z0-9]{4,12}$/.test(invite)) out.invite = invite;
    return out;
  } catch {
    return {};
  }
}

// ---------- Auth ----------
export const auth = {
  async signUp(email: string, password: string, fullName: string) {
    const body = await raw('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, data: { full_name: fullName, terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString(), ...signupSource() } }),
    });
    const s = toSession(body);
    if (s) save(s);
    return { session: s, user: (body?.user ?? body) as User };
  },
  async signIn(email: string, password: string) {
    const body = await raw('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const s = toSession(body);
    save(s);
    return s;
  },
  async signOut() {
    const token = session?.access_token;
    save(null);
    if (token) {
      try {
        await raw('/auth/v1/logout', { method: 'POST' }, token);
      } catch {
        /* session already cleared locally */
      }
    }
  },
  /** Password reset link, sent by THE LOBBY mailer (the default Supabase mailer only reaches the team). */
  async recover(email: string, redirectTo: string) {
    await raw('/functions/v1/mailer', {
      method: 'POST',
      body: JSON.stringify({ action: 'recover', email, redirectTo }),
    });
  },
  /** Login providers switched on in Supabase (e.g. google). */
  async providers(): Promise<Record<string, boolean>> {
    try {
      const s = await raw('/auth/v1/settings', { method: 'GET' });
      return s?.external || {};
    } catch {
      return {};
    }
  },
  /** Google sign-in: Supabase sends the member back here with the tokens in the fragment. */
  googleUrl(redirectTo: string) {
    return `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  },
  /** Adds fields to the member's metadata (terms acceptance for social sign-ins). */
  async updateMetadata(data: Record<string, any>) {
    const token = await validToken();
    const body = await raw('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ data }) }, token);
    if (session) save({ ...session, user: body });
  },
  async updatePassword(password: string) {
    const token = await validToken();
    const body = await raw('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ password }) }, token);
    if (session) save({ ...session, user: body });
  },
  /** Accepts the tokens Supabase puts in the URL fragment after email links. */
  adoptFromFragment(fragment: string): string | null {
    const p = new URLSearchParams(fragment.replace(/^#/, ''));
    const at = p.get('access_token');
    const rt = p.get('refresh_token');
    if (!at || !rt) return null;
    let user: User = { id: '', email: '' };
    try {
      const payload = JSON.parse(atob(at.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      user = { id: payload.sub, email: payload.email, user_metadata: payload.user_metadata };
    } catch {
      /* keep placeholder user */
    }
    save({
      access_token: at,
      refresh_token: rt,
      expires_at: Number(p.get('expires_at')) || Math.floor(Date.now() / 1000) + Number(p.get('expires_in') || 3600),
      user,
    });
    return p.get('type');
  },
};

// ---------- Data (PostgREST) ----------
export async function select<T = any>(table: string, query: string): Promise<T[]> {
  const token = await validToken();
  return raw(`/rest/v1/${table}?${query}`, { method: 'GET' }, token);
}

export async function upsert<T = any>(table: string, rows: any, onConflict?: string): Promise<T[]> {
  const token = await validToken();
  const q = onConflict ? `?on_conflict=${onConflict}` : '';
  return raw(`/rest/v1/${table}${q}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  }, token);
}

/** Insert that silently skips rows already present (ON CONFLICT DO NOTHING). */
export async function insertIgnore(table: string, rows: any): Promise<void> {
  const token = await validToken();
  await raw(`/rest/v1/${table}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  }, token);
}

export async function update<T = any>(table: string, filter: string, patch: any): Promise<T[]> {
  const token = await validToken();
  return raw(`/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  }, token);
}

/** Calls a Supabase Edge Function as the signed-in user. */
export async function invoke<T = any>(fn: string, body: Record<string, any>): Promise<T> {
  const token = await validToken();
  return raw(`/functions/v1/${fn}`, { method: 'POST', body: JSON.stringify(body) }, token);
}

// ---------- Storage ----------
/** Uploads (or replaces) a file in a Storage bucket as the signed-in user. */
export async function storageUpload(bucket: string, path: string, body: Blob, contentType: string) {
  const token = await validToken();
  return raw(`/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, 'x-upsert': 'true', 'cache-control': 'max-age=3600' },
    body,
  }, token);
}

/** Deletes files from a Storage bucket as the signed-in user. */
export async function storageRemove(bucket: string, paths: string[]) {
  const token = await validToken();
  return raw(`/storage/v1/object/${bucket}`, { method: 'DELETE', body: JSON.stringify({ prefixes: paths }) }, token);
}

export async function rpc<T = any>(fn: string, args: Record<string, any>): Promise<T> {
  const token = await validToken();
  return raw(`/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) }, token);
}
