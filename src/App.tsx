import React, { useEffect } from 'react';
import { RouterProvider, useLocation, match, navigate } from './lib/router';
import { AuthProvider, useAuth } from './lib/auth';
import { auth } from './lib/api';
import { ToastHost, Empty, ButtonLink, Screen, TopBar } from './components/ui';
import Welcome from './pages/Welcome';
import Auth from './pages/Auth';
import { ForgotPassword, NewPassword } from './pages/Password';
import Home from './pages/Home';
import Academy from './pages/Academy';
import Course from './pages/Course';
import Lesson from './pages/Lesson';
import Quiz from './pages/Quiz';
import Opportunities from './pages/Opportunities';
import Profile from './pages/Profile';
import Premium from './pages/Premium';
import { Privacy, Terms } from './pages/Legal';
import Admin from './pages/Admin';
import Story from './pages/Story';
import Verify from './pages/Verify';

// Supabase email links land with tokens in the fragment: adopt them before routing.
(function adoptEmailLink() {
  const h = window.location.hash;
  if (h.includes('access_token=')) {
    const type = auth.adoptFromFragment(h);
    window.history.replaceState(null, '', window.location.pathname + (type === 'recovery' ? '#/nuova-password' : '#/home'));
  } else if (h.includes('error_description=')) {
    window.history.replaceState(null, '', window.location.pathname + '#/accedi');
  }
})();

const PUBLIC = ['/', '/accedi', '/password', '/privacy', '/termini', '/andrea', '/verifica'];

function Routes() {
  const { path } = useLocation();
  const { session } = useAuth();
  const isPublic = PUBLIC.includes(path);

  useEffect(() => {
    if (!session && !isPublic) navigate('/accedi', true);
    if (session && (path === '/' || path === '/accedi')) navigate('/home', true);
  }, [session, path, isPublic]);

  if (!session && !isPublic) return null;

  if (path === '/') return <Welcome />;
  if (path === '/accedi') return <Auth />;
  if (path === '/password') return <ForgotPassword />;
  if (path === '/verifica') return <Verify />;
  if (path === '/nuova-password') return <NewPassword />;
  if (path === '/home') return <Home />;
  if (path === '/academy') return <Academy />;
  if (path === '/opportunita') return <Opportunities />;
  if (path === '/profilo') return <Profile />;
  if (path === '/premium') return <Premium />;
  if (path === '/admin') return <Admin />;
  if (path === '/andrea') return <Story />;
  if (path === '/privacy') return <Privacy />;
  if (path === '/termini') return <Terms />;
  let p;
  if ((p = match('/corso/:slug', path))) return <Course slug={p.slug} />;
  if ((p = match('/lezione/:id', path))) return <Lesson id={p.id} />;
  if ((p = match('/quiz/:id', path))) return <Quiz id={p.id} />;
  return (
    <Screen>
      <TopBar />
      <main className="page">
        <Empty title="Pagina non trovata" text="Il link potrebbe essere vecchio o incompleto." action={<ButtonLink to="/home">Torna alla Home</ButtonLink>} />
      </main>
    </Screen>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <Routes />
        <ToastHost />
      </AuthProvider>
    </RouterProvider>
  );
}
