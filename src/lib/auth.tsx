import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, currentSession, onSession, refresh } from './api';
import { getProfile } from './data';

type AuthState = {
  session: Session | null;
  displayName: string;
  setDisplayName: (n: string) => void;
};

const Ctx = createContext<AuthState>({ session: null, displayName: '', setDisplayName: () => {} });

function nameFrom(s: Session | null) {
  const meta = s?.user?.user_metadata || {};
  return meta.full_name || meta.name || (s?.user?.email ? s.user.email.split('@')[0] : '');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(currentSession());
  const [displayName, setDisplayName] = useState<string>(nameFrom(currentSession()));

  useEffect(() => onSession((s) => {
    setSession(s);
    setDisplayName(nameFrom(s));
  }), []);

  // Refresh an expired stored session on start-up.
  useEffect(() => {
    const s = currentSession();
    if (s && s.expires_at - Date.now() / 1000 < 60) refresh();
  }, []);

  useEffect(() => {
    if (!session) return;
    getProfile()
      .then((p) => p?.display_name && setDisplayName(p.display_name))
      .catch(() => {});
  }, [session?.user?.id]);

  const set = useCallback((n: string) => setDisplayName(n), []);
  return <Ctx.Provider value={{ session, displayName, setDisplayName: set }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
