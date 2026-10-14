import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, currentSession, onSession, refresh } from './api';
import { getProfile, getPlan, Plan, FREE_PLAN } from './data';

type AuthState = {
  session: Session | null;
  displayName: string;
  setDisplayName: (n: string) => void;
  plan: Plan;
  setPlan: (p: Plan) => void;
  refreshPlan: () => void;
};

const FREE: Plan = FREE_PLAN;
const Ctx = createContext<AuthState>({ session: null, displayName: '', setDisplayName: () => {}, plan: FREE, setPlan: () => {}, refreshPlan: () => {} });

function nameFrom(s: Session | null) {
  const meta = s?.user?.user_metadata || {};
  return meta.full_name || meta.name || (s?.user?.email ? s.user.email.split('@')[0] : '');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(currentSession());
  const [displayName, setDisplayName] = useState<string>(nameFrom(currentSession()));
  const [plan, setPlan] = useState<Plan>(FREE);

  useEffect(() => onSession((s) => {
    setSession(s);
    setDisplayName(nameFrom(s));
    if (!s) setPlan(FREE);
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
    getPlan().then(setPlan).catch(() => {});
  }, [session?.user?.id]);

  const setName = useCallback((n: string) => setDisplayName(n), []);
  const setP = useCallback((p: Plan) => setPlan(p), []);
  const refreshPlan = useCallback(() => { getPlan().then(setPlan).catch(() => {}); }, []);
  return (
    <Ctx.Provider value={{ session, displayName, setDisplayName: setName, plan, setPlan: setP, refreshPlan }}>{children}</Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
