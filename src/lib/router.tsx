import React, { createContext, useContext, useEffect, useState } from 'react';

// Hash router: works on any static host without rewrite rules.
type Loc = { path: string; query: URLSearchParams };

function read(): Loc {
  const h = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  return { path: path || '/', query: new URLSearchParams(qs || '') };
}

const Ctx = createContext<Loc>(read());

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [loc, setLoc] = useState<Loc>(read());
  useEffect(() => {
    const on = () => {
      setLoc(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return <Ctx.Provider value={loc}>{children}</Ctx.Provider>;
}

export function useLocation() {
  return useContext(Ctx);
}

export function navigate(to: string, replace = false) {
  const target = '#' + to;
  if (replace) window.location.replace(target);
  else window.location.hash = to;
}

export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

export function Link({ to, className, children, ...rest }: { to: string; className?: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={'#' + to} className={className} {...rest}>
      {children}
    </a>
  );
}
