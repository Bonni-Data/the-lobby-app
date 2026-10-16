// End-to-end check with Supabase mocked at the network layer (no real accounts or data touched).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');

const root = new URL('..', import.meta.url).pathname;
const shots = root + 'tests/shots/' + (process.env.VW ? `w${process.env.VW}/` : '');
mkdirSync(shots, { recursive: true });
const PORT = 4173;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '-d', root + 'dist'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const uid = '11111111-1111-1111-1111-111111111111';
const course = {
  id: 'c1', slug: 'test-comune', category: 'comune', title: '[TEST] Come funziona davvero un Comune', subtitle: 'Corso di prova per il prototipo',
  description: 'CORSO DI PROVA. Contenuto segnaposto per collaudare catalogo, player, progressi e quiz.', audience: null,
  level: 'base', access_level: 'free', objectives: ['Collaudare il flusso end-to-end', 'Capire chi decide in un Comune'],
  course_modules: [{ id: 'm1', position: 1, title: '[TEST] Modulo 1', description: null, lessons: [] }],
};
const lessons = [
  { id: 'l1', position: 1, title: '[TEST] Lezione 1', summary: 'Lezione di prova, senza video reale', duration_seconds: 60, status: 'published' },
  { id: 'l2', position: 2, title: '[TEST] Lezione 2', summary: 'Seconda lezione di prova', duration_seconds: 240, status: 'published' },
];
const course2 = { category: 'italia',
  id: 'c2', slug: 'parlamento', title: 'Il Parlamento in 20 minuti', subtitle: 'Come nasce una legge', description: 'Mock', audience: null,
  level: 'intermedio', access_level: 'free', objectives: [], course_modules: [{ id: 'm2', position: 1, title: 'Le Camere', lessons: [] }],
};
let loggedIn = false;
let progress = [];
let attempts = [];
let waitlisted = false;
let approved = false;
let verified = true;
const mailer = { recover: [], tests: 0, resent: 0 };
let isAdmin = false;
let draftPublished = false;
let live = { event_id: 'ev-live', course_id: 'c5', yes_count: 14, min_seats: 15, my_response: null, starts_at: null };
let liveUrl = null;
let liveClosed = 0;
let myApp = null;
const apps = [];
const events = [{ id: 'e0', kind: 'cena', title: 'Cena della Lobby: l’Europa vista da Bruxelles', summary: 'Una sera per parlare di carriere europee.', starts_at: new Date(Date.now() + 9 * 86400000).toISOString(), location: 'Milano, Brera', seats: 12, yes_count: 0, my_response: null }];
const notified = [];
const taken = new Set(['andrea@example.com']);
const users = { 'andrea@example.com': 'password123' };
let failures = [];
const meetings = [];
const tracked = [];
const reports = [];
const unsubscribed = [];
let emailPrefs = { digest: true, reminders: true };
const TEST_PHOTO = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAHgAAABQCAIAAABd+SbeAAABNklEQVR42u3bzXHCMBgE0KBxBbSQlnKgDAqjJVqgheSQI3Bh9LOS3l7BmHmzFnj86fR7vXxJ+xQEoEELaNCgBTRoAZ2aY5Yver7d3730+PkG3dD3+T3J4sfUxC8PyeQ+1iDO5y6LKVf/nDWh6+pEWZdVldOsy8LKUdZlbeUc67K8coi1W/A9oHsWbWypNXoD6P4VG1hqjQYNeuqreNR5NRo0aAENGjQC0KBlIuhRT6lHnVejQYOe9yoeOFWj0XtA96zY2CExjd4Guk/Rhs88RjS6tULCZGnK0tHOImR+N2iNbiGSMyWd9WNY1yVqFj3uX0ctnbSJ/8StFf9GHz+utoelObddWRVWAPsMt7iBdgsOWkCDBi2gQQto0KAFNGgBDRq0gAYtoEGDFtCgBTRo0AIatIDunT/R8lfcb4k0OgAAAABJRU5ErkJggg==', 'base64');
const profile = { name: 'Andrea Bonazzi', avatar: null, patches: [], upload: null, deletes: 0 };
const checksL1 = [
  { type: 'choice', after: 'Passi', prompt: 'Chi approva il bilancio?', options: ['Il sindaco', 'Il consiglio comunale', 'Il prefetto'], correct: 1, why: 'Lo approva il consiglio comunale.' },
  { type: 'truefalse', prompt: '', statement: 'Il sindaco nomina gli assessori.', answer: true, why: 'La giunta la sceglie il sindaco.' },
  { type: 'order', after: 'Chi decide', prompt: 'Metti in ordine i passaggi del bilancio.', items: ['La giunta prepara la proposta', 'Le commissioni la esaminano', 'Il consiglio la vota'], why: 'Prima la giunta, poi le commissioni, infine il consiglio.' },
];
const game = { checks: new Set(), sims: [], certId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' };
const scenario = {
  title: 'Il bilancio conteso', role: 'Consigliera comunale di opposizione', intro: 'Mancano tre giorni al voto sul bilancio.', start: 'a',
  nodes: {
    a: { text: 'La giunta deposita il bilancio il venerdì sera. Che cosa fai?', choices: [
      { label: 'Leggo tutto nel weekend', score: 2, feedback: 'Bene: chi conosce le carte vince.', next: 'b' },
      { label: 'Aspetto la commissione', score: 1, feedback: 'Perdi tempo prezioso.', next: 'b' },
      { label: 'Attacco sui social', score: 0, feedback: 'Senza dati, sei debole.', next: 'b' } ] },
    b: { text: 'In commissione scopri un taglio ai centri giovani.', choices: [
      { label: 'Presento un emendamento coperto', score: 2, feedback: 'Così si fa.', next: null },
      { label: 'Protesto e basta', score: 0, feedback: 'Rumore, nessun risultato.', next: null } ] },
  },
  endings: [{ min: 0.8, title: 'Da manuale', text: 'Hai ottenuto il risultato.' }, { min: 0.4, title: 'Buona partita', text: 'Qualcosa hai portato a casa.' }, { min: 0, title: 'Da rivedere', text: 'Riprova.' }],
};
function statsNow() {
  const doneIds = progress.filter((p) => p.status === 'completed').map((p) => p.lesson_id);
  const courseDone = ['l1', 'l2'].every((id) => doneIds.includes(id));
  const bestQuiz = attempts.reduce((m, a) => Math.max(m, 10 * a.score + (a.score === a.max_score ? 20 : 0)), 0);
  const simXp = game.sims.reduce((m, x) => Math.max(m, x.xp), 0);
  const xp = 50 * doneIds.length + 10 * game.checks.size + bestQuiz + (courseDone ? 200 : 0) + simXp;
  const badges = [];
  if (doneIds.length) badges.push({ id: 'primo-passo', at: new Date().toISOString() });
  if (courseDone) badges.push({ id: 'primo-corso', at: new Date().toISOString() });
  if (game.sims.length) badges.push({ id: 'prima-simulazione', at: new Date().toISOString() });
  return { xp, streak: xp ? 1 : 0, best_streak: xp ? 1 : 0, active_today: xp > 0, lessons: doneIds.length, checks: game.checks.size, perfect_quizzes: 0, badges,
    courses: courseDone ? [{ course_id: 'c1', cert_id: game.certId, completed_at: new Date().toISOString() }] : [],
    sims: game.sims.slice(-1).map((x) => ({ course_id: 'c1', score: x.score, max: x.max, ending: x.ending, xp: x.xp })) };
}

let termsMissing = false;
const accountCalls = [];
function session(email, name = 'Andrea Bonazzi') {
  const meta = termsMissing ? { full_name: name } : { full_name: name, terms_accepted_at: '2026-10-15T10:00:00Z' };
  return {
    access_token: 'aaa.' + Buffer.from(JSON.stringify({ sub: uid, email, user_metadata: meta })).toString('base64') + '.sig',
    refresh_token: 'r', expires_in: 3600, token_type: 'bearer',
    user: { id: uid, email, user_metadata: meta },
  };
}

async function mock(route) {
  const req = route.request();
  const url = new URL(req.url());
  const path = url.pathname;
  let body = null;
  try { body = req.postDataJSON?.() ?? null; } catch { body = null; }
  const json = (status, data) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });

  if (path === '/rest/v1/rpc/assert_email_available') {
    return taken.has((body.p_email || '').toLowerCase())
      ? json(400, { code: 'P0001', message: 'email_already_registered' })
      : json(200, true);
  }
  if (path === '/auth/v1/signup') {
    if (taken.has(body.email)) return json(422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' });
    if (!body.data?.terms_accepted_at) failures.push('FAIL signup without terms metadata');
    globalThis.__signupData = body.data;
    taken.add(body.email); users[body.email] = body.password; loggedIn = true;
    return json(200, session(body.email, body.data?.full_name));
  }
  if (path === '/auth/v1/token') {
    if (users[body.email] && users[body.email] === body.password) { loggedIn = true; return json(200, session(body.email)); }
    return json(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
  }
  if (path === '/auth/v1/settings') return json(200, { external: { email: true, google: true } });
  if (path === '/auth/v1/user' && req.method() === 'PUT') {
    termsMissing = false;
    return json(200, { id: uid, email: 'giulia@example.com', user_metadata: { full_name: 'Giulia Rossi', ...(body.data || {}) } });
  }
  if (path === '/functions/v1/account') {
    accountCalls.push(body);
    if (body.action === 'export') return json(200, { account: { email: 'giulia@example.com' }, lesson_progress: [] });
    if (body.action === 'delete') return body.confirm === 'ELIMINA' ? json(200, { ok: true }) : json(400, { error: 'confirm_required' });
  }
  if (path === '/auth/v1/logout') { loggedIn = false; return route.fulfill({ status: 204 }); }
  if (path === '/rest/v1/rpc/live_courses') {
    return json(200, [{ ...live, join_url: isAdmin || (approved && live.my_response === 'yes') ? liveUrl : null }]);
  }
  if (path === '/rest/v1/rpc/live_schedule') {
    if (!isAdmin) return json(400, { code: 'P0001', message: 'forbidden' });
    if (!/^https:\/\//.test(body.p_join_url)) return json(400, { code: 'P0001', message: 'bad_url' });
    live.starts_at = body.p_starts_at; liveUrl = body.p_join_url;
    return route.fulfill({ status: 204 });
  }
  if (path === '/rest/v1/rpc/live_complete') {
    if (!isAdmin) return json(400, { code: 'P0001', message: 'forbidden' });
    liveClosed += 1;
    live = { event_id: 'ev-live-' + liveClosed, course_id: 'c5', yes_count: 0, min_seats: 15, my_response: null, starts_at: null }; liveUrl = null;
    return json(200, live.event_id);
  }
  if (path === '/rest/v1/courses') {
    const withLessons = (c, ls) => ({ ...c, course_modules: c.course_modules.map((m) => ({ ...m, lessons: loggedIn ? ls : [] })) });
    const course3 = { id: 'c3', slug: 'test-masterclass', category: 'europa', title: '[TEST] Masterclass: bandi europei', subtitle: 'Corso Premium di prova', description: 'Mock premium', audience: null,
      level: 'avanzato', access_level: 'premium', objectives: ['Leggere un bando europeo', 'Capire cosa cercano i valutatori'], course_modules: [{ id: 'm3', position: 1, title: '[TEST] Dal bando alla candidatura', lessons: [] }] };
    const course4 = { id: 'c4', slug: 'test-bozza', category: 'comune', title: '[TEST] Corso in bozza', subtitle: 'Testi da validare', description: 'Mock draft', audience: null, coming_soon: !draftPublished,
      level: 'base', access_level: 'free', objectives: [], course_modules: [{ id: 'm4', position: 1, title: '[TEST] Modulo bozza', lessons: [] }] };
    const course5 = { id: 'c5', slug: 'test-live', category: 'skill', title: '[TEST] Public speaking avanzato', subtitle: 'Corso live di prova', description: 'Mock live', audience: null,
      level: 'avanzato', access_level: 'premium', format: 'live', objectives: ['Tenere la sala anche quando è ostile'],
      course_modules: [{ id: 'm5', position: 1, title: 'Fuori dalla zona di comfort', description: 'Un piano di quattro settimane per allenare il coraggio di parlare.', lessons: [] }] };
    const all = [withLessons(course, lessons), withLessons(course2, [{ id: 'p1', position: 1, title: 'Camera e Senato', duration_seconds: 300, status: 'published' }]),
      withLessons(course5, isAdmin ? [{ id: 'x1', position: 1, title: 'Vecchia lezione archiviata', duration_seconds: 300, status: 'archived' }] : []),
      withLessons(course3, approved ? [{ id: 'pl1', position: 1, title: '[TEST] Come si legge un bando europeo', duration_seconds: 420, status: 'published' }] : []),
      withLessons(course4, isAdmin || draftPublished ? [{ id: 'd1', position: 1, title: '[TEST] Lezione in bozza', duration_seconds: 300, status: draftPublished ? 'published' : 'draft' }] : [])];
    const slug = url.searchParams.get('slug');
    return json(200, slug ? all.filter((c) => 'eq.' + c.slug === slug) : all);
  }
  if (path === '/rest/v1/rpc/request_meeting') {
    if (!approved && !isAdmin) return json(400, { code: 'P0001', message: 'premium_only' });
    if ((body.p_message || '').trim().length < 20) return json(400, { code: 'P0001', message: 'too_short' });
    const m = { id: 'mt' + (meetings.length + 1), name: body.p_name, email: body.p_email, phone: body.p_phone, topic: body.p_topic, message: body.p_message,
      link: body.p_link, minutes: body.p_minutes, mode: body.p_mode, availability: body.p_availability, status: 'nuova', created_at: new Date().toISOString(), handled_at: null };
    meetings.unshift(m);
    return json(200, { id: m.id, created_at: m.created_at });
  }
  if (path === '/rest/v1/meeting_requests') {
    if (req.method() === 'PATCH') {
      const id = (url.searchParams.get('id') || '').replace('eq.', '');
      const m = meetings.find((x) => x.id === id);
      if (m) Object.assign(m, body);
      return json(200, m ? [m] : []);
    }
    return json(200, meetings);
  }
  if (path === '/rest/v1/rpc/my_stats') return json(200, loggedIn ? statsNow() : null);
  if (path === '/rest/v1/rpc/check_answer') {
    const c = checksL1[body.p_index];
    const ok = c.type === 'choice' ? body.p_answer === c.correct : c.type === 'truefalse' ? body.p_answer === c.answer : JSON.stringify(body.p_answer) === JSON.stringify(c.items.map((_, i) => i));
    const key = body.p_lesson + ':' + body.p_index;
    const fresh = ok && !game.checks.has(key);
    if (ok) game.checks.add(key);
    return json(200, { correct: ok, xp: fresh ? 10 : 0 });
  }
  if (path === '/rest/v1/course_simulations') {
    const sel = url.searchParams.get('select') || '';
    if (sel.startsWith('scenario')) return json(200, [{ scenario }]);
    return json(200, [{ course_id: 'c1', title: scenario.title, role: scenario.role }]);
  }
  if (path === '/rest/v1/rpc/sim_finish') {
    let node = scenario.nodes[scenario.start]; let score = 0; let max = 0;
    for (const i of body.p_path) { const c = node.choices[i]; score += c.score; max += Math.max(...node.choices.map((x) => x.score)); node = c.next ? scenario.nodes[c.next] : null; }
    const pct = score / max;
    const ending = scenario.endings.find((e) => pct >= e.min);
    const xp = Math.round(100 * pct);
    const prev = game.sims.reduce((m, x) => Math.max(m, x.xp), 0);
    game.sims.push({ score, max, ending: ending.title, xp });
    return json(200, { score, max, xp: Math.max(0, xp - prev), ending });
  }
  if (path === '/rest/v1/rpc/certificate') {
    if (body.p_id !== game.certId) return json(200, null);
    return json(200, { id: game.certId, name: 'Giulia Rossi', course: 'Come funziona davvero un Comune', slug: 'test-comune', category: 'comune', level: 'base', premium: false,
      completed_at: '2026-10-15T10:00:00Z', lessons: 2, minutes: 5, mine: loggedIn });
  }
  if (path === '/rest/v1/lessons') {
    const id = (url.searchParams.get('id') || '').replace('eq.', '');
    const l = lessons.find((x) => x.id === id);
    if (!l || !loggedIn) return json(200, []);
    return json(200, [{ ...l, checks: [], lesson_checks: id === 'l1' ? { checks: checksL1 } : null, transcript: 'Trascrizione di prova.\n\n## Passi\n\n1. **Uno**: primo passo.\n2. Secondo passo.\n\n- Kit:\n  - CV\n  - SPID\n\n## Chi decide\n\nIl **consiglio comunale** vota il bilancio, la **giunta** lo prepara.\n\n## In breve\n\n- Primo punto\n- Secondo punto', module_id: 'm1',
      course_modules: { id: 'm1', title: '[TEST] Modulo 1', position: 1, courses: { slug: 'test-comune', title: course.title } },
      quizzes: id === 'l1' ? [{ id: 'q1', title: '[TEST] Quiz lezione 1' }] : [], lesson_assets: [],
      sources: id === 'l1' ? [{ title: 'TUEL, d.lgs. 267/2000 (Normattiva)', url: 'https://www.normattiva.it/' }] : [], reviewed_at: id === 'l1' ? '2026-10-16T08:00:00Z' : null, updated_at: '2026-10-14T08:00:00Z' }]);
  }
  if (path === '/rest/v1/lesson_progress') {
    if (req.method() === 'POST') {
      progress = progress.filter((p) => p.lesson_id !== body.lesson_id);
      progress.push({ ...body, updated_at: new Date().toISOString() });
      return json(201, [body]);
    }
    return json(200, progress);
  }
  if (path === '/rest/v1/quizzes') {
    return json(200, [{ id: 'q1', title: '[TEST] Quiz lezione 1', lesson_id: 'l1', quiz_questions: [
      { id: 'qq1', position: 1, prompt: 'Chi approva il bilancio del Comune?', options: ['Il sindaco da solo', 'Il consiglio comunale', 'La prefettura'] },
      { id: 'qq2', position: 2, prompt: 'Ogni quanto si vota per il consiglio comunale?', options: ['Ogni 3 anni', 'Ogni 5 anni', 'Ogni 7 anni'] },
    ] }]);
  }
  if (path === '/rest/v1/rpc/submit_quiz_attempt') {
    const a = body.p_answers;
    const score = (a.qq1 === 1 ? 1 : 0) + (a.qq2 === 1 ? 1 : 0);
    attempts.push({ quiz_id: 'q1', score, max_score: 2, created_at: new Date().toISOString() });
    return json(200, { score, max_score: 2, details: [
      { question_id: 'qq1', correct_option: 1, chosen: a.qq1, explanation: 'Il bilancio è approvato dal consiglio comunale.' },
      { question_id: 'qq2', correct_option: 1, chosen: a.qq2, explanation: 'Il mandato ordinario dura cinque anni.' },
    ] });
  }
  if (path === '/rest/v1/quiz_attempts') return json(200, attempts);
  if (path === '/rest/v1/rpc/opportunities_feed') return json(200, globalThis.__opps || []);
  if (path === '/rest/v1/rpc/my_plan') return json(200, { premium: approved, admin: isAdmin, application: myApp, email_verified: verified || isAdmin });
  if (path === '/rest/v1/rpc/confirm_email') { if (body.p_token === 'good-token') { verified = true; return json(200, 'ok'); } return json(200, 'invalid'); }
  if (path === '/rest/v1/rpc/resend_verification') { mailer.resent += 1; return json(200, 'sent'); }
  if (path === '/rest/v1/rpc/email_status') return json(200, { live: false, from_email: null, admin_email: 'thelobbysupport@gmail.com', sent_7d: 0, queued: 2, errors_7d: 0, last_sent_at: null });
  if (path === '/rest/v1/rpc/growth_stats') return json(200, { members: 42, last_7d: 12, verified: 30, premium: 8, pending: 3, sources: [{ source: 'instagram', n: 9 }, { source: 'diretto', n: 3 }] });
  if (path === '/rest/v1/rpc/email_send_test') { mailer.tests += 1; return json(200, 'id-test'); }
  if (path === '/functions/v1/mailer') { if (body.action === 'recover') mailer.recover.push(body); return json(200, { ok: true }); }
  if (path === '/rest/v1/rpc/submit_premium_application') {
    if (['p_about', 'p_experience', 'p_goal'].some((k) => (body[k] || '').trim().length < 30)) return json(400, { code: 'P0001', message: 'too_short' });
    myApp = { status: 'pending', created_at: new Date().toISOString() };
    apps.unshift({ id: 'a' + apps.length, full_name: 'Giulia Rossi', email: 'giulia@example.com', about: body.p_about, experience: body.p_experience, goal: body.p_goal, link: body.p_link, ...myApp });
    return json(200, { id: apps[0].id, full_name: 'Giulia Rossi', email: 'giulia@example.com', created_at: myApp.created_at });
  }
  if (path === '/rest/v1/premium_applications') return json(200, apps);
  if (path === '/rest/v1/rpc/events_feed') {
    return json(200, events.map((e) => ({ ...e, locked: !approved, summary: approved ? e.summary : null, location: approved ? e.location : null })));
  }
  if (path === '/rest/v1/rpc/rsvp_event' && body.p_event === live.event_id) {
    if (!approved && !isAdmin) return json(400, { code: 'P0001', message: 'premium_required' });
    if (live.my_response !== body.p_response) live.yes_count += body.p_response === 'yes' ? 1 : live.my_response === 'yes' ? -1 : 0;
    live.my_response = body.p_response;
    return json(200, { response: live.my_response, yes_count: live.yes_count });
  }
  if (path === '/rest/v1/rpc/rsvp_event') {
    if (!approved) return json(400, { code: 'P0001', message: 'premium_required' });
    const e = events.find((x) => x.id === body.p_event);
    e.my_response = body.p_response; e.yes_count = body.p_response === 'yes' ? 1 : 0;
    return json(200, { response: e.my_response, yes_count: e.yes_count });
  }
  if (path === '/rest/v1/rpc/event_attendees' && body.p_event === live.event_id) {
    return json(200, live.my_response === 'yes' ? [{ full_name: 'Giulia Rossi', email: 'giulia@example.com', response: 'yes', updated_at: new Date().toISOString() }] : []);
  }
  if (path === '/rest/v1/rpc/event_attendees') return json(200, events[0]?.my_response === 'yes' ? [{ full_name: 'Giulia Rossi', email: 'giulia@example.com', response: 'yes', updated_at: new Date().toISOString() }] : []);
  if (path === '/rest/v1/premium_events') {
    if (req.method() === 'POST') { events.push({ id: 'e' + events.length, kind: 'cena', yes_count: 0, my_response: null, ...body }); return json(201, [body]); }
    if (req.method() === 'PATCH') return json(200, []);
    return json(200, []);
  }
  if (path === '/rest/v1/rpc/course_outline') {
    return json(200, body.p_course === 'c3' ? [
      { module_id: 'm3', lesson_id: 'pl1', lesson_position: 1, title: '[TEST] Come si legge un bando europeo', duration_seconds: 420 },
      { module_id: 'm3', lesson_id: 'pl2', lesson_position: 2, title: '[TEST] Gli errori che fanno scartare una candidatura', duration_seconds: 360 },
    ] : []);
  }
  if (path === '/rest/v1/rpc/publish_course') {
    if (!isAdmin || body.p_slug !== 'test-bozza') return json(400, { code: 'P0001', message: 'forbidden' });
    draftPublished = true;
    return json(200, 1);
  }
  if (path === '/rest/v1/rpc/review_premium_application') {
    const a = apps.find((x) => x.id === body.p_id);
    a.status = body.p_decision; a.reviewer_note = body.p_note; a.reviewed_at = new Date().toISOString();
    return route.fulfill({ status: 204 });
  }
  if (path === '/rest/v1/premium_waitlist') { waitlisted = true; return route.fulfill({ status: 201, body: '' }); }
  if (path === '/rest/v1/premium_events') return json(200, []);
  if (path === '/rest/v1/path_stages') return json(200, [
    { id: 'orientarsi', position: 1, title: 'Orientarsi', skill: 'Leggere la mappa del potere', summary: 'Chi decide cosa.', premium: false },
    { id: 'il-comune', position: 2, title: 'Il Comune, da vicino', skill: 'Muoverti nel livello più vicino a te', summary: 'Sindaco, giunta, consiglio.', premium: false },
    { id: 'dal-vivo', position: 3, title: 'Dal vivo con Andrea', skill: 'Fare il salto', summary: 'Masterclass live.', premium: true },
  ]);
  if (path === '/rest/v1/path_items') return json(200, [
    { course_id: 'c1', stage_id: 'orientarsi', position: 1, optional: false },
    { course_id: 'c2', stage_id: 'il-comune', position: 1, optional: false },
    { course_id: 'c5', stage_id: 'dal-vivo', position: 1, optional: false },
  ]);
  if (path === '/rest/v1/rpc/track') { tracked.push(body.p_name); return route.fulfill({ status: 204, body: '' }); }
  if (path === '/rest/v1/rpc/my_email_prefs') return json(200, emailPrefs);
  if (path === '/rest/v1/rpc/set_email_prefs') { emailPrefs = { digest: body.p_digest, reminders: body.p_reminders }; return json(200, emailPrefs); }
  if (path === '/rest/v1/rpc/email_unsubscribe') { unsubscribed.push(body.p_what); return json(200, body.p_token === '9f1c2d3e-4b5a-4c6d-8e7f-001122334455' ? 'ok' : 'invalid'); }
  if (path === '/rest/v1/rpc/my_invite') return json(200, { code: 'K7MQ2X', joined: 2 });
  if (path === '/rest/v1/rpc/report_content') { reports.push(body); return json(200, 'rep-1'); }
  if (path === '/rest/v1/content_reports') return json(200, reports.map((r, i) => ({ id: 'r' + i, lesson_id: r.p_lesson, message: r.p_message, status: 'nuova', created_at: new Date().toISOString(), lessons: { title: '[TEST] Lezione 1' } })));
  if (path === '/rest/v1/rpc/admin_metrics') return json(200, {
    members: 128, new_7d: 31, new_30d: 128, active_7d: 54, activated: 77, activated_24h: 60, eligible_d7: 80, returned_d7: 28,
    visits_7d: 940, opp_clicks_7d: 212, invited: 19, applications_pending: 3, premium: 8, reports_open: reports.length,
    digest_subs: 84, sent_24h: 86, sent_month: 1450, deferred: 0,
    stages: [{ title: 'Orientarsi', n: 77 }, { title: 'Il Comune, da vicino', n: 41 }, { title: 'Dal vivo con Andrea', n: 6 }],
    signups_by_day: Array.from({ length: 14 }, (_, i) => ({ d: new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10), n: (i * 7) % 11 + 1 })),
    sources: [{ source: 'instagram', n: 60 }, { source: 'invito', n: 19 }, { source: 'diretto', n: 49 }],
  });
  if (path.startsWith('/storage/v1/object/public/avatars/')) {
    return route.fulfill({ status: 200, contentType: 'image/jpeg', body: profile.upload?.bytes || TEST_PHOTO });
  }
  if (path === `/storage/v1/object/avatars/${uid}/avatar.jpg` && req.method() === 'POST') {
    profile.upload = { bytes: req.postDataBuffer(), type: req.headers()['content-type'], upsert: req.headers()['x-upsert'] };
    return json(200, { Key: `avatars/${uid}/avatar.jpg` });
  }
  if (path === '/storage/v1/object/avatars' && req.method() === 'DELETE') {
    if ((body?.prefixes || []).includes(`${uid}/avatar.jpg`)) profile.deletes++;
    return json(200, []);
  }
  if (path === '/rest/v1/profiles') {
    if (req.method() === 'PATCH') {
      profile.patches.push(body);
      if ('display_name' in body) profile.name = body.display_name;
      if ('avatar_url' in body) profile.avatar = body.avatar_url;
      return json(200, [{ id: uid, display_name: profile.name, avatar_url: profile.avatar }]);
    }
    return json(200, [{ id: uid, display_name: profile.name, avatar_url: profile.avatar }]);
  }
  failures.push('UNMOCKED ' + req.method() + ' ' + path);
  return json(404, { message: 'not mocked' });
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: Number(process.env.VW || 390), height: Number(process.env.VH || 844) }, deviceScaleFactor: process.env.VW ? 1 : 2, locale: 'it-IT', reducedMotion: process.env.MOTION ? 'no-preference' : 'reduce' });
await ctx.addInitScript(() => {
  window.__spoken = [];
  class U { constructor(t) { this.text = t; } }
  window.SpeechSynthesisUtterance = U;
  let queue = []; let busy = false; let timer = null;
  const synth = {
    speaking: false, pending: false, paused: false,
    getVoices: () => [{ name: 'Alice', lang: 'it-IT', localService: true }],
    speak(u) { window.__spoken.push(u.text); queue.push(u); pump(); },
    cancel() { queue = []; clearTimeout(timer); busy = false; synth.speaking = false; },
    pause() {}, resume() {}, addEventListener() {}, removeEventListener() {},
  };
  function pump() {
    if (busy) return;
    const u = queue.shift();
    if (!u) { synth.speaking = false; return; }
    busy = true; synth.speaking = true;
    timer = setTimeout(() => { busy = false; if (u.onend) u.onend(); pump(); }, 25);
  }
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
});
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && !/fonts|ERR_|Failed to load resource/.test(m.text()) && consoleErrors.push(m.text()));
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + e.message));
await page.route('**/*.supabase.co/**', mock);
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.route('https://formsubmit.co/**', (r) => { notified.push(r.request().postDataJSON()); return r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":"true"}' }); });

const base = `http://localhost:${PORT}/`;
const shot = (n) => page.screenshot({ path: shots + n + '.png', fullPage: true });
const check = async (cond, msg) => { if (!(await cond)) failures.push('FAIL ' + msg); };

// 1. Welcome (arrives from an ad link)
await page.goto(base + '?utm_source=instagram&utm_campaign=beta');
await page.waitForSelector('.welcome__hero');
await page.waitForTimeout(1900);
await shot('01-welcome');

// 2. Signup with an existing email -> warning, back to Accedi
await page.click('text=Crea il tuo account');
await page.waitForSelector('.segmented');
await page.fill('input[autocomplete="name"]', 'Andrea');
await page.fill('input[type="email"]', 'andrea@example.com');
await page.fill('input[autocomplete="new-password"] >> nth=0', 'qualcosa123');
await page.fill('input[autocomplete="new-password"] >> nth=1', 'qualcosa123');
await check(page.textContent('label.field:has(input[autocomplete="name"]) span').then((t) => t.trim() === 'Nome e cognome'), 'signup asks for name and surname');
await page.click('button[type="submit"]');
await page.waitForSelector('.alert');
await check(page.textContent('.alert').then((t) => t.includes('nome e cognome')), 'first name alone is not enough');
await page.fill('input[autocomplete="name"]', 'Andrea Bonazzi');
await page.click('button[type="submit"]');
await page.waitForSelector('.alert:has-text("Termini")');
await check(page.textContent('.alert').then((t) => t.includes('accetta i Termini')), 'terms acceptance required');
await page.check('.check input');
await page.click('button[type="submit"]');
await page.waitForSelector('.alert:has-text("già registrata")');
await page.waitForSelector('.alert');
await check(page.textContent('.alert').then((t) => t.includes('già registrata')), 'email già registrata message');
await check(page.getAttribute('.segmented button[aria-selected="true"]', 'aria-selected').then(() => page.textContent('.segmented .is-on')).then((t) => t.trim() === 'Accedi'), 'switched to Accedi tab');
await shot('02-signup-email-taken');

// 3. Wrong password
await page.fill('input[type="password"]', 'sbagliata');
await page.click('button[type="submit"]');
await page.waitForSelector('.alert');
await check(page.textContent('.alert').then((t) => t.includes('non corretti')), 'wrong password message');
await page.waitForSelector('.oauth__google');
await check(page.getAttribute('.oauth__google', 'href').then((h) => h.includes('/auth/v1/authorize?provider=google') && h.includes('redirect_to=')), 'google sign-in link');

// 4. New signup -> Home
await page.click('.segmented button:has-text("Registrati")');
await page.fill('input[autocomplete="name"]', 'Giulia Rossi');
await page.fill('input[type="email"]', 'giulia@example.com');
await page.fill('input[autocomplete="new-password"] >> nth=0', 'password456');
await page.fill('input[autocomplete="new-password"] >> nth=1', 'password456');
await page.check('.check input');
await page.click('button[type="submit"]');
await page.waitForSelector('.h-hello');
await page.waitForSelector('.resume');
await check(page.textContent('.h-hello').then((t) => t.includes('Andrea') || t.includes('Giulia')), 'greeting with name');
await check(Promise.resolve(globalThis.__signupData?.utm_source === 'instagram' && globalThis.__signupData?.utm_campaign === 'beta'), 'campaign source saved at signup');
await shot('03-home');

// 4b. «Aggiungi alla schermata Home» pop-up: not before 5 minutes of use, then the browser's own prompt
const fakeInstallPrompt = () => page.evaluate(() => {
  const e = new Event('beforeinstallprompt', { cancelable: true });
  e.prompt = async () => { window.__installPrompted = true; };
  e.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(e);
});
await fakeInstallPrompt();
await page.waitForTimeout(6000);
await check(page.locator('.install-pop').count().then((n) => n === 0), 'no install pop-up in the first minutes');
await page.evaluate(() => localStorage.setItem('thelobby.usage', '296'));
await page.reload();
await page.waitForSelector('.h-hello');
await fakeInstallPrompt();
await page.waitForSelector('.install-pop', { timeout: 15000 });
await check(page.textContent('.install-pop').then((t) => t.includes('Installa THE LOBBY sul computer')), 'install pop-up after 5 minutes (computer wording)');
await check(Promise.resolve(tracked.includes('install_prompt')), 'pop-up appearance tracked');
await shot('03b-install-popup');
await page.click('.install-pop button:has-text("Installa l’app")');
await page.waitForSelector('.install-pop', { state: 'detached' });
await check(page.evaluate(() => window.__installPrompted === true), 'install opens the browser prompt');
await check(Promise.resolve(tracked.includes('install_click')), 'install click tracked');
await page.reload();
await page.waitForSelector('.h-hello');
await fakeInstallPrompt();
await page.waitForTimeout(6000);
await check(page.locator('.install-pop').count().then((n) => n === 0), 'pop-up does not come back after installing');

// 5. Academy: the recommended path first, then the full catalogue
await page.click('.tabbar__item:has-text("Academy")');
await page.waitForSelector('.path-hero');
await check(page.locator('.stages > .stage').count().then((n) => n === 3), 'path shows every stage');
await check(page.textContent('.next-step').then((t) => t.includes('Tappa 1') && t.includes('[TEST] Lezione 1')), 'next step points to the first lesson');
await check(page.locator('.stage--current').count().then((n) => n === 1), 'one current stage');
await check(page.locator('.stage--premium .preview').count().then((n) => n >= 1), 'premium stage shows a preview to free members');
await shot('04-academy-path');
await page.click('.section-tabs button:has-text("Tutti i corsi")');
await page.waitForSelector('.course-row');
await page.waitForSelector('.preview');
await check(page.textContent('.preview').then((t) => t.includes('Come si legge un bando europeo')), 'premium course preview shows lesson titles');
await check(page.locator('.cat-section').count().then((n) => n === 4), 'courses grouped by area');
await check(page.textContent('.preview:has-text("Public speaking avanzato")').then((t) => t.includes('Live su Teams') && !t.includes('Fuori dalla zona di comfort')), 'live preview without programme');
await check(page.locator('.course-row .cover--small').count().then((n) => n > 0), 'light course covers');
await shot('04-academy-corsi');
await page.click('.chips .chip--btn:has-text("Comune")');
await check(page.locator('.cat-section').count().then((n) => n === 1), 'area filter');
await shot('04b-academy-comune');

// 5b. Live course, not Premium: teaser, no programme, no booking
await page.goto(base + '#/corso/test-live');
await page.waitForSelector('.live-panel--locked');
await check(page.locator('.modules--live').count().then((n) => n === 0), 'live programme hidden without Premium');
await check(page.locator('.live-panel button:has-text("Prenota")').count().then((n) => n === 0), 'no booking without Premium');
await shot('05a-live-locked');
await page.goto(base + '#/academy');
await page.waitForSelector('.course-row');

// 6. Course
await page.click('.course-row:has-text("Come funziona davvero un Comune")');
await page.waitForSelector('.course-hero');
await page.waitForSelector('.course-hero__stage');
await check(page.textContent('.course-hero__stage').then((t) => t.includes('Tappa 1') && t.includes('Orientarsi')), 'course shows its stage in the path');
await shot('05-course');

// 7. Lesson as cards: intro, sections, checks, listen, completion
await page.click('text=Inizia il corso');
await page.waitForSelector('.lcard--intro');
await check(page.textContent('.lcard__voice').then((t) => t.includes('Trascrizione di prova')), 'lesson intro rendered');
await check(page.locator('.story-bar span').count().then((n) => n === 8), 'story bar: intro, 2 sections, 3 checks, brief, end');
await shot('06a-lesson-intro');
await page.click('.lcard__start button:has-text("Inizia")');
await page.waitForSelector('.lcard--section');
await check(page.locator('.lcard .lesson-text ol li').count().then((n) => n === 2), 'numbered list rendered');
await check(page.locator('.lcard .lesson-text li > ul li').count().then((n) => n === 2), 'nested list rendered');
await check(page.textContent('.lcard__terms').then((t) => t.includes('Uno')), 'key terms chips');
await shot('06b-lesson-card');
await page.click('.cardnav__btn--next');
await page.waitForSelector('.lcard--check');
await check(page.locator('.cardnav__btn--next').isDisabled(), 'cannot skip a check');
await page.click('.ask__options .option >> nth=1');
await page.waitForSelector('.ask__why');
await page.waitForSelector('.xp-pop');
await check(page.textContent('.ask__why').then((t) => t.includes('Esatto')), 'right answer feedback');
await shot('06c-lesson-check');
await page.click('.cardnav__btn--next');
await page.waitForSelector('.tf');
await page.click('.tf__btn:has-text("Falso")');
await page.waitForSelector('.ask.is-wrong');
await check(page.textContent('.ask__why').then((t) => t.includes('Non proprio')), 'wrong answer feedback');
await page.click('.cardnav__btn--next');
await page.waitForSelector('.lcard--section');
await check(page.textContent('.lcard__head').then((t) => t.includes('Chi decide')), 'check placed after its section');
// Listen: reads the card, moves on by itself and stops at the next check
await page.click('.listen__btn');
await page.waitForSelector('.order__pool');
await check(page.waitForFunction(() => window.__spoken.some((t) => t.includes('Chi decide')) && window.__spoken.some((t) => t.includes('Metti in ordine')), null, { timeout: 3000 }).then(() => true, () => false), 'listen reads cards aloud');
await check(page.locator('.listen.is-on').count().then((n) => n === 1), 'listening stays on at a check');
await page.click('.order__item:has-text("La giunta prepara")');
await page.click('.order__item:has-text("Le commissioni")');
await page.click('.order__item:has-text("Il consiglio la vota")');
await page.waitForSelector('.ask.is-right');
await shot('06d-lesson-order');
await page.click('.listen__btn');
await page.click('.cardnav__btn--next');
await page.waitForSelector('.lcard--brief');
await shot('06e-lesson-brief');
await page.click('.cardnav__btn--next:has-text("Concludi")');
await page.waitForSelector('.lcard__end');
await page.waitForFunction(() => document.querySelector('.lcard__end h2')?.textContent.includes('Lezione completata'));
await check(Promise.resolve(progress.some((p) => p.lesson_id === 'l1' && p.status === 'completed')), 'lesson completed at the last card');
await check(page.textContent('.lcard__score').then((t) => t.includes('2 su 3 sfide')), 'checks score on end card');
await check(page.textContent('.lcard__end .lesson-foot').then((t) => t.includes('Normattiva') && t.includes('Ricontrollata sulle fonti')), 'lesson shows sources and review date');
await page.click('.lcard__end .lesson-foot button:has-text("Segnala un errore")');
await page.fill('.report textarea', 'Il numero dei consiglieri è cambiato nel 2024.');
await page.click('.report button:has-text("Invia")');
await page.waitForSelector('.lcard__end .lesson-foot >> text=Segnalazione inviata');
await check(Promise.resolve(reports.length === 1 && reports[0].p_lesson === 'l1'), 'error report sent for the lesson');
await page.waitForTimeout(400);
await shot('06-lesson');
// Page mode: whole text plus the checks, then back to cards
await page.click('.mode-btn');
await page.waitForSelector('.page-checks');
await check(page.textContent('.lesson-text').then((t) => t.includes('Trascrizione di prova')), 'page mode shows full text');
await shot('06f-lesson-page');
await page.click('.mode-btn');
await page.waitForSelector('.lcard--intro');
await check(page.locator('.lcard__done').count().then((n) => n === 1), 'intro shows lesson already completed');
await page.click('.mode-btn');
await page.waitForSelector('.page-checks');

// 8. Quiz
await page.click('text=Fai il quiz');
await page.waitForSelector('.quiz__prompt');
await page.click('.option >> nth=1');
await shot('07-quiz');
await page.click('text=Avanti');
await page.click('.option >> nth=0');
await page.click('text=Invia le risposte');
await page.waitForSelector('.quiz-result');
await check(page.textContent('.quiz-result h1').then((t) => t.includes('1 risposta giusta su 2')), 'quiz score shown');
await shot('08-quiz-result');

// 8b. Second lesson in page mode completes the course: level up, certificate, final simulation
await page.goto(base + '#/lezione/l2');
await page.waitForSelector('.page-checks, .lesson-actions');
await page.click('button:has-text("Segna come completata")');
await page.waitForSelector('.levelup');
await check(page.textContent('.levelup__name').then((t) => t.includes('Attivista')), 'level up to Attivista');
await shot('08b-level-up');
await page.click('.levelup button:has-text("Continua")');
await page.evaluate(() => localStorage.setItem('lobby.lesson.mode', 'cards'));
await page.goto(base + '#/corso/test-comune');
await page.waitForSelector('.finale-card--sim');
await check(page.locator('.finale-card--cert a:has-text("Apri il certificato")').count().then((n) => n === 1), 'certificate unlocked on course page');
await shot('08c-course-finale');
await page.click('.finale-card--sim a');
await page.waitForSelector('.sim-intro');
await shot('08d-sim-intro');
await page.click('button:has-text("Entra in scena")');
await page.waitForSelector('.sim-scene');
await page.click('.sim-choices .option >> nth=0');
await page.waitForSelector('.sim-feedback.is-top');
await shot('08e-sim-choice');
await page.click('.sim-feedback button');
await page.waitForFunction(() => document.querySelector('.sim-scene__text')?.textContent.includes('centri giovani'));
await page.click('.sim-choices .option >> nth=1');
await page.click('.sim-feedback button:has-text("Scopri")');
await page.waitForSelector('.sim-end');
await page.waitForSelector('.sim-end .pill--xp');
await check(page.textContent('.sim-end h1').then((t) => t.includes('Buona partita')), 'simulation ending by score');
await check(page.textContent('.sim-end .pill--xp').then((t) => t.includes('+50 XP')), 'simulation XP');
await shot('08f-sim-end');
await page.click('button:has-text("Rigioca")');
await page.waitForSelector('.sim-scene');
await page.goto(base + '#/certificato/' + game.certId);
await page.waitForSelector('.cert__frame img');
await check(page.getAttribute('.cert a[href*="linkedin.com/profile/add"]', 'href').then((h) => h.includes('organizationName=THE+LOBBY') && h.includes('certUrl=')), 'LinkedIn add-to-profile link');
await check(page.evaluate(() => { const i = document.querySelector('.cert__frame img'); return i.naturalWidth === 1080 && i.naturalHeight === 1350; }), 'certificate image 1080x1350');
await shot('08g-certificate');
await page.goto(base + '#/traguardi');
await page.waitForSelector('.rank__name');
await check(page.textContent('.rank__name').then((t) => t.includes('Attivista')), 'achievements level');
await check(page.locator('.badges li.is-on').count().then((n) => n === 3), 'three badges earned');
await check(page.locator('.certs__row').count().then((n) => n === 2), 'certificate and simulation listed');
await shot('08h-traguardi');
await page.goto(base + '#/home');
await page.waitForSelector('.levelcard');
await check(page.textContent('.levelcard').then((t) => t.includes('Attivista') && t.includes('XP')), 'home level card');

// 9. Opportunities (empty, then with data)
await page.goto(base + '#/opportunita');
await page.waitForSelector('.empty');
await shot('09-opps-empty');
const opp = (id, tag, extra = {}) => ({ id, tag, category: 'programma', is_new: false, locked: false, title: null, organization: null, summary: null,
    requirements: null, covered: null, location: null, deadline: null, deadline_note: null, opens_on: null, url: null, source: null, ...extra });
globalThis.__opps = [
  opp('o1', 'viaggio', { title: 'Delegato giovane all’Assemblea generale ONU', organization: 'SIOI', category: 'bando', is_new: true,
    summary: 'Rappresenti i giovani italiani a New York, dentro la settimana più importante dell’ONU.', requirements: '18-26 anni, cittadinanza italiana, inglese C1',
    covered: 'Viaggio e alloggio pagati', location: 'New York', deadline: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10), deadline_note: 'ore 12:00', url: 'https://example.com/1' }),
  opp('o2', 'lavoro', { title: 'Tirocini Schuman al Parlamento europeo', organization: 'Parlamento europeo', category: 'tirocinio',
    summary: 'Cinque mesi dentro il Parlamento, a Bruxelles o Lussemburgo.', requirements: 'Laurea, 18+ anni, inglese o francese', covered: 'Borsa di circa 1.500 € al mese',
    location: 'Bruxelles', deadline: new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10), url: 'https://example.com/2' }),
  opp('o3', 'sviluppo', { title: 'Corpo europeo di solidarietà', organization: 'Commissione europea', category: 'volontariato',
    summary: 'Volontariato in Europa da 2 a 12 mesi: impari, viaggi, conosci gente.', requirements: '18-30 anni', location: 'Varie città UE', url: 'https://example.com/3' }),
  opp('o4', 'sviluppo', { title: 'Corso EU Academy sui fondi europei', organization: 'Commissione europea', category: 'formazione', deadline: new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10), url: 'https://example.com/4' }),
  opp('o5', 'lavoro', { title: 'Concorso EPSO per assistenti', organization: 'EPSO', category: 'concorso', deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), url: 'https://example.com/5' }),
];
await page.reload();
await page.waitForSelector('.opp-card');
await check(page.locator('.opp-cards > .opp-card').count().then((n) => n === 5), 'all opportunities open to everyone');
await check(page.locator('.nudge, .opp-card--locked').count().then((n) => n === 0), 'no premium lock on opportunities');
await check(page.locator('.opp-card__share').count().then((n) => n === 5), 'share button on every opportunity');
await shot('10-opps');
await page.click('.chip--btn:has-text("Viaggi")');
await check(page.locator('.opp-card').count().then((n) => n === 1), 'tag filter');

// 9b. Home shows the 3 free ones + Premium teaser
await page.click('.tabbar__item:has-text("Home")');
await page.waitForSelector('.teaser');
await check(page.locator('.opp-list li').count().then((n) => n === 3), 'home shows the top 3 opportunities');
await check(page.textContent('.block__head:has-text("Opportunità")').then((t) => t.includes('Vedi tutte (5)')), 'home links to all opportunities');
await shot('10b-home-opps');

// 9c. Premium page + application
await page.click('.tabbar__item:has-text("Premium")');
await page.waitForSelector('.premium-hero');
await check(page.textContent('.premium-hero').then((t) => t.includes('Gratuito') && !t.includes('€')), 'premium is free, no price');
await shot('10c-premium');
await page.click('.premium-hero button:has-text("Candidati a Premium")');
await page.click('button:has-text("Invia la candidatura")');
await page.waitForSelector('.apply .alert');
await check(page.textContent('.apply .alert').then((t) => t.includes('almeno 30')), 'min length enforced');
await page.fill('.apply textarea >> nth=0', 'Ho 22 anni, studio Scienze politiche a Milano e seguo la vita del mio Comune.');
await page.fill('.apply textarea >> nth=1', 'Due anni di volontariato in un centro giovani e rappresentante degli studenti in facoltà.');
await page.fill('.apply textarea >> nth=2', 'Voglio candidarmi a un tirocinio nelle istituzioni europee entro un anno.');
await check(page.textContent('.apply__field:has(input[type="url"])').then((t) => t.includes('LinkedIn') && t.includes('portfolio')), 'link field suggests LinkedIn or another link');
await page.fill('.apply input[type="url"]', 'https://linkedin.com/in/giulia');
await page.fill('.apply input[autocomplete="name"]', 'Giulia');
await page.click('button:has-text("Invia la candidatura")');
await page.waitForSelector('.apply .alert:has-text("nome e cognome")');
await page.fill('.apply input[autocomplete="name"]', 'Giulia Rossi');
await shot('10d-premium-form');
await page.locator('.apply__field:has(input[autocomplete="name"])').screenshot({ path: shots + '10d1-premium-name.png' });
await page.locator('.apply__field:has(input[type="url"])').screenshot({ path: shots + '10d2-premium-link.png' });
await page.click('button:has-text("Invia la candidatura")');
await page.waitForSelector('.apply-status .premium-status');
await check(page.textContent('.apply-status').then((t) => t.includes('Candidatura inviata')), 'application pending state');
await check(Promise.resolve(profile.patches.some((x) => x.display_name === 'Giulia Rossi')), 'full name saved to the profile before applying');
await page.waitForTimeout(300);
await check(Promise.resolve(notified.length === 0), 'no third-party form service called');
await shot('10e-premium-pending');

// 9d. Admin review (Andrea's account)
isAdmin = true;
await page.reload();
await page.click('.tabbar__item:has-text("Profilo")');
await page.waitForSelector('text=Area founder');
await page.click('text=Area founder');
await page.waitForSelector('.ntiles');
await check(page.textContent('.ntiles').then((t) => t.includes('128') && t.includes('tornano dopo 7 giorni')), 'founder numbers: members and retention');
await check(page.textContent('.nlimits').then((t) => t.includes('Quasi al limite')), 'founder warned before the free email limit');
await check(page.locator('.nchart span').count().then((n) => n === 14), 'signups chart');
await shot('10f0-admin-numeri');
await page.click('.section-tabs button:has-text("Candidature")');
await page.waitForSelector('.appcard');
await page.waitForSelector('.email-strip');
await check(page.textContent('.email-strip:not(.growth-strip)').then((t) => t.includes('Email in preparazione') && t.includes('2 pronte in coda')), 'founder sees email status');
await check(page.textContent('.growth-strip').then((t) => t.includes('42 iscritti') && t.includes('instagram 9')), 'founder sees growth and sources');
await page.click('.email-strip:not(.growth-strip) button:has-text("Prova")');
await page.waitForTimeout(300);
await check(Promise.resolve(mailer.tests === 1), 'test email requested');
await shot('10f-admin');
await page.fill('.appcard textarea', 'Percorso solido, benvenuta.');
await page.click('button:has-text("Attiva Premium")');
await page.waitForSelector('.chip--btn:has-text("Da valutare (0)")');
await check(Promise.resolve(apps[0].status === 'approved' && apps[0].reviewer_note === 'Percorso solido, benvenuta.'), 'application approved with note');

// 9e. Founder area: publish a dinner
await page.click('.section-tabs button:has-text("Cene")');
await page.fill('.admin-form input >> nth=0', 'Cena di prova');
await page.fill('.admin-form input[type="datetime-local"]', '2026-12-01T20:30');
await page.fill('.admin-form input >> nth=2', 'Milano');
await page.click('button:has-text("Pubblica la cena")');
await page.waitForSelector('.appcard:has-text("Cena di prova")');
await shot('10g-admin-cene');

// 9e-bis. Founder reviews and publishes a draft course
await page.goto(base + '#/academy');
await page.waitForSelector('.course-row');
await check(page.locator('.chip--draft:has-text("Bozza da validare")').count().then((n) => n === 1), 'academy shows draft badge to founder');
await page.goto(base + '#/corso/test-bozza');
await page.waitForSelector('.draft-panel');
await check(page.locator('.lesson-row .chip--draft').count().then((n) => n === 1), 'draft lesson tagged');
await shot('10g2-course-draft');
await page.goto(base + '#/admin?sezione=corsi');
await page.waitForSelector('.appcard .draft-panel');
await shot('10g3-admin-corsi');
await page.click('.appcard button:has-text("Pubblica il corso")');
await page.click('.appcard button:has-text("Sì, pubblica")');
await page.waitForSelector('text=Nessun corso in attesa di validazione');
await check(Promise.resolve(draftPublished), 'publish_course called');
await check(page.locator('.live-list li:has-text("[TEST] Corso in bozza")').count().then((n) => n === 1), 'published course listed');

await check(page.locator('.live-list li:has-text("Public speaking")').count().then((n) => n === 0), 'live course not in text courses');

// 9e-ter. Live course: a Premium member books, the founder sets date and Teams link, the member gets the link
isAdmin = false;
approved = true;
verified = false;
await page.goto(base + '#/home');
await page.reload();
await page.waitForSelector('.verify-banner');
await page.click('.verify-banner__btn');
await page.waitForTimeout(300);
await check(Promise.resolve(mailer.resent === 1), 'verification link resent');
await shot('10g3b-verify-banner');
await page.goto(base + '#/corso/test-live');
await page.waitForSelector('.live-panel .verify-banner');
await check(page.locator('.live-panel button:has-text("Prenota il tuo posto")').count().then((n) => n === 0), 'booking needs a confirmed email');
await page.goto(base + '#/verifica?t=bad-token');
await page.waitForSelector('.verify h1');
await check(page.textContent('.verify h1').then((t) => t.includes('non valido')), 'invalid verification link');
await page.goto(base + '#/verifica?t=good-token');
await page.waitForSelector('.verify h1:has-text("Email confermata")');
await shot('10g3c-verified');
await page.goto(base + '#/corso/test-live');
await page.reload();
await page.waitForSelector('.live-panel button:has-text("Prenota il tuo posto")');
await check(page.textContent('.live-panel').then((t) => t.includes('Prenotazioni aperte') && !/15|iscritti su/.test(t)), 'live panel without the seat threshold');
await check(page.locator('.live-panel .live-meter').count().then((n) => n === 0), 'no seat counter for members');
await check(page.locator('.modules--live li').count().then((n) => n === 1), 'live programme visible to Premium');
await shot('10g4-live-premium');
await page.click('.live-panel button:has-text("Prenota il tuo posto")');
await page.waitForSelector('.live-panel__badge:has-text("Sei iscritto")');
await check(page.textContent('.live-panel').then((t) => t.includes('Il tuo posto è prenotato')), 'booked message');
await shot('10g5-live-booked');
isAdmin = true;
await page.goto(base + '#/admin?sezione=live');
await page.reload();
await page.waitForSelector('.live-admin');
await check(page.textContent('.live-admin').then((t) => t.includes('Pronta: fissa la data') && t.includes('giulia@example.com')), 'founder sees ready status and attendees');
await page.fill('.live-admin input[type="datetime-local"]', '2026-11-20T18:30');
await page.fill('.live-admin input[type="url"]', 'nonunlink');
await page.click('.live-admin button:has-text("Fissa data e link")');
await page.waitForSelector('.live-admin .alert');
await page.fill('.live-admin input[type="url"]', 'https://teams.microsoft.com/l/meetup-join/test');
await page.click('.live-admin button:has-text("Fissa data e link")');
await page.waitForSelector('.live-admin__status:has-text("Data fissata")');
await check(Promise.resolve(liveUrl === 'https://teams.microsoft.com/l/meetup-join/test' && !!live.starts_at), 'live scheduled');
await shot('10g6-admin-live');
isAdmin = false;
await page.goto(base + '#/corso/test-live');
await page.reload();
await page.waitForSelector('.live-panel a:has-text("Entra su Teams")');
await check(page.getAttribute('.live-panel a:has-text("Entra su Teams")', 'href').then((h) => h === 'https://teams.microsoft.com/l/meetup-join/test'), 'member gets the Teams link');
await check(page.locator('.live-panel button:has-text("Aggiungi al calendario")').count().then((n) => n === 1), 'calendar button');
await shot('10g7-live-scheduled');
await page.goto(base + '#/premium');
await page.waitForSelector('.live-strip li');
await check(page.textContent('.live-strip').then((t) => t.includes('In calendario')), 'premium page lists live courses');
isAdmin = true;
await page.goto(base + '#/admin?sezione=live');
await page.reload();
await page.waitForSelector('.live-admin button:has-text("Segna come svolta")');
await page.click('.live-admin button:has-text("Segna come svolta")');
await page.click('.live-admin button:has-text("Sì, chiudi l’edizione")');
await page.waitForSelector('.live-admin__status:has-text("Raccolta iscrizioni")');
await check(Promise.resolve(liveClosed === 1), 'edition closed and reopened');
isAdmin = false;
approved = false;

// 9f. Dinners: locked for free members, RSVP for Premium
isAdmin = false;
approved = false;
await page.goto(base + '#/opportunita?sezione=cene');
await page.reload();
await page.waitForSelector('.dinners-locked');
await shot('10h-cene-locked');
approved = true;
await page.reload();
await page.waitForSelector('.dinner');
await page.click('.dinner >> nth=0 >> .rsvp__btn--yes');
await page.waitForSelector('.dinner >> nth=0 >> .rsvp__btn--yes.is-on');
await check(page.textContent('.dinner >> nth=0').then((t) => t.includes('1 presente')), 'rsvp counted');
await shot('10i-cene-premium');
await page.goto(base + '#/premium');
await page.waitForSelector('.feature__link');
await check(page.locator('.feature__link:has-text("Vai alle cene")').count().then((n) => n === 1), 'premium page links to dinners');
await check(page.textContent('.premium-hero, .features').then((t) => !/15 iscritti|a 15/.test(t)), 'no seat threshold in the Premium page');
await page.click('.feature__link:has-text("Prenota un incontro")');
await page.waitForSelector('#incontro form');
await page.click('#incontro .chip--btn:has-text("Rivedere un testo")');
await page.fill('#incontro textarea', 'Corto');
await page.click('#incontro button:has-text("Invia la richiesta")');
await page.waitForSelector('#incontro .alert');
await page.fill('#incontro textarea', 'Ho scritto il mio primo intervento per il consiglio comunale e vorrei capire se funziona.');
await page.fill('#incontro input[type="url"]', 'https://docs.google.com/document/d/test');
await page.click('#incontro .meet__dur button:has-text("30 min")');
await page.click('#incontro .chip--btn:has-text("Telefono")');
await page.fill('#incontro input[type="tel"]', '+39 333 1234567');
await page.fill('#incontro input[placeholder^="Es. sere"]', 'Sere dopo le 18');
await shot('10j-meeting-form');
await page.click('#incontro button:has-text("Invia la richiesta")');
await page.waitForSelector('.meet__done');
await check(Promise.resolve(meetings.length === 1 && meetings[0].minutes === 30 && meetings[0].mode === 'telefono' && meetings[0].topic === 'testo' && meetings[0].email === 'giulia@example.com'), 'meeting request sent with all fields');
await shot('10k-meeting-sent');
isAdmin = true;
await page.goto(base + '#/admin?sezione=incontri');
await page.reload();
await page.waitForSelector('.meet-card');
await check(page.getAttribute('.meet-card a.btn:has-text("Rispondi")', 'href').then((h) => h.startsWith('mailto:giulia@example.com')), 'founder can reply by email');
await shot('10l-admin-incontri');
await page.click('.meet-card button:has-text("Gestita")');
await page.waitForSelector('.center-state:has-text("Nessuna richiesta da gestire")');
await check(Promise.resolve(meetings[0].status === 'gestita'), 'meeting marked as handled');
isAdmin = false;
await page.goto(base + '#/academy');
await page.waitForSelector('.academy-premium');
await check(page.locator('.preview').count().then((n) => n === 0), 'no preview when premium');
approved = false;

// 10. Profile: invite a friend, email preferences, then logout
await page.click('.tabbar__item:has-text("Profilo")');
await page.waitForSelector('.profile-head');
await page.waitForSelector('.invite__link');
await check(page.textContent('.invite').then((t) => t.includes('thelobbyitalia.it/?invito=K7MQ2X') && t.includes('2')), 'invite link and friends count');
await page.waitForSelector('.mail-prefs .switch input:not([disabled])');
await page.click('.mail-prefs .switch:has-text("Riepilogo del lunedì")');
await page.waitForTimeout(300);
await check(Promise.resolve(emailPrefs.digest === false && emailPrefs.reminders === true), 'weekly digest switched off from profile');
await check(page.locator('.menu a[href="#/neutralita"]').count().then((n) => n === 1), 'profile links the neutrality page');
await page.waitForTimeout(300);
await shot('11-profile');
await page.click('button:has-text("Esci")');
await page.waitForSelector('.welcome__hero');
await check(page.evaluate(() => localStorage.getItem('thelobby.session') === null), 'session cleared on logout');

// 10d. Password reset goes through THE LOBBY mailer
await page.goto(base + '#/password');
await page.fill('input[type="email"]', 'giulia@example.com');
await page.click('button:has-text("Invia il link")');
await page.waitForSelector('text=Se esiste un account');
await check(Promise.resolve(mailer.recover.length === 1 && mailer.recover[0].email === 'giulia@example.com' && mailer.recover[0].redirectTo.startsWith('http://localhost')), 'recovery sent through mailer');

// 10e. Legal pages are public
await page.goto(base + '#/privacy');
await page.waitForSelector('.legal h2');
await check(page.textContent('.legal').then((t) => t.includes('Andrea Bonazzi') && t.includes('Garante') && t.includes('Resend') && t.includes('Microsoft') && t.includes('14 anni')), 'privacy page content');
await shot('13-privacy');
await page.goto(base + '#/termini');
await page.waitForSelector('.legal h2');
await check(page.textContent('.legal').then((t) => t.includes('Non le organizza, non le finanzia')), 'terms opportunity clause');
await shot('14-termini');

// 10f. A shared certificate is public and verifiable
await page.goto(base + '#/certificato/' + game.certId);
await page.waitForSelector('.cert__verified');
await check(page.locator('.cert a[href*="linkedin"]').count().then((n) => n === 0), 'public certificate has no owner actions');
await shot('14b-certificate-public');
await page.goto(base + '#/certificato/00000000-0000-0000-0000-000000000000');
await page.waitForSelector('.empty');

// 10g. Neutrality page, opportunities and unsubscribe work without an account
await page.goto(base + '#/neutralita');
await page.waitForSelector('.legal h2');
await check(page.textContent('.legal').then((t) => t.includes('Nessun partito') && t.includes('I tuoi dati non fanno politica')), 'neutrality page content');
await shot('14c-neutralita');
await page.goto(base + '#/opportunita');
await page.waitForSelector('.guest-cta');
await check(page.locator('.opp-cards > .opp-card').count().then((n) => n === 5), 'guest sees every opportunity');
await check(page.locator('.tabbar').count().then((n) => n === 0), 'guest view without the member tab bar');
await shot('14d-opps-guest');
await page.goto(base + '#/email?u=9f1c2d3e-4b5a-4c6d-8e7f-001122334455&k=digest');
await page.waitForSelector('.unsub button:has-text("Sì, disiscrivimi")');
await check(Promise.resolve(unsubscribed.length === 0), 'unsubscribe waits for a click (link scanners do nothing)');
await page.click('.unsub button:has-text("Sì, disiscrivimi")');
await page.waitForSelector('.unsub h1:has-text("Fatto")');
await check(Promise.resolve(unsubscribed[0] === 'digest'), 'unsubscribed from the weekly digest');
await shot('14e-unsubscribe');
await page.goto(base + '#/email?u=bad&k=digest');
await page.waitForSelector('.unsub h1:has-text("Link non valido")');
await check(Promise.resolve(tracked.includes('visit') && tracked.includes('lesson_open') && tracked.includes('path_open')), 'cookie-free usage events');

// 11. Protected route redirects to Accedi when logged out
await page.goto(base + '#/academy');
await page.waitForSelector('.segmented');
await shot('12-login');

// 12. Founder story is public
await page.goto(base + '#/andrea');
await page.waitForSelector('.story-hero');
await check(page.textContent('.press').then((t) => t.includes('Il Giorno')), 'story press links');
await shot('15-story');

// 13. Account without accepted terms (e.g. first Google sign-in): one-time gate
termsMissing = true;
await page.goto(base + '#/accedi');
await page.fill('input[type="email"]', 'giulia@example.com');
await page.fill('input[type="password"]', 'password456');
await page.click('button[type="submit"]');
await page.waitForSelector('.terms-gate');
await shot('16-terms-gate');
await page.click('.terms-gate button:has-text("Entra nella Lobby")');
await page.waitForSelector('.terms-gate .alert');
await page.check('.terms-gate .check input');
await page.click('.terms-gate button:has-text("Entra nella Lobby")');
await page.waitForSelector('.h-hello');
await check(Promise.resolve(!termsMissing), 'terms accepted through metadata');

// 13b. Profile photo: add, see it in the tab bar, remove
await page.goto(base + '#/profilo');
await page.waitForSelector('.profile-head');
await check(page.locator('.avatar img').count().then((n) => n === 0), 'no photo yet: initials');
await page.setInputFiles('.avatar-wrap input[type="file"]', { name: 'io.png', mimeType: 'image/png', buffer: TEST_PHOTO });
await page.waitForSelector('.avatar img');
await check(Promise.resolve(profile.upload?.type === 'image/jpeg' && profile.upload?.upsert === 'true' && profile.upload.bytes.length > 500), 'photo uploaded as a square JPEG');
await check(Promise.resolve(String(profile.avatar).startsWith(`https://unyqeshkfkvijehnlnex.supabase.co/storage/v1/object/public/avatars/${uid}/avatar.jpg?v=`)), 'photo address saved on the profile');
await check(page.locator('.tabbar__avatar').count().then((n) => n === 1), 'photo shown in the tab bar');
await check(page.evaluate(() => { const i = document.querySelector('.avatar img'); return i.complete && i.naturalWidth === 360 && i.naturalHeight === 360; }), 'photo cropped to a square');
await shot('17a-profile-photo');
await page.click('.profile-head button:has-text("Rimuovi foto")');
await page.waitForSelector('.avatar img', { state: 'detached' });
await check(Promise.resolve(profile.deletes === 1 && profile.avatar === null), 'photo removed');
await page.click('.profile-head button:has-text("Modifica nome")');
await page.fill('.inline-form input', 'Giulia');
await page.click('.inline-form button[type="submit"]');
await page.waitForSelector('.toast:has-text("nome e cognome")');
await check(page.locator('.inline-form').count().then((n) => n === 1), 'profile name needs name and surname');
await page.fill('.inline-form input', 'Giulia  Rossi');
await page.click('.inline-form button[type="submit"]');
await page.waitForSelector('.profile-head h1:has-text("Giulia Rossi")');

// 14. Data rights from the profile: download, then delete
await page.goto(base + '#/profilo');
await page.waitForSelector('.mydata');
const dl = page.waitForEvent('download');
await page.click('.mydata button:has-text("Scarica una copia")');
await check(dl.then((d) => d.suggestedFilename() === 'the-lobby-i-miei-dati.json'), 'data export downloaded');
await page.click('.mydata button:has-text("Elimina il mio account")');
await check(page.locator('.mydata__confirm button:has-text("Elimina per sempre")').isDisabled(), 'delete needs confirmation word');
await page.fill('.mydata__confirm input', 'elimina');
await shot('17-delete-account');
await page.click('.mydata__confirm button:has-text("Elimina per sempre")');
await page.waitForSelector('.welcome__hero');
await check(Promise.resolve(accountCalls.some((c) => c.action === 'delete' && c.confirm === 'ELIMINA')), 'account deleted');

// 15. iPhone: no install prompt, so the pop-up shows the two taps (from the Profile on demand, or by itself after 5 minutes);
//     Instagram's browser explains how to open the real browser
for (const [ua, label, expect, auto] of [
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', 'iphone', 'Aggiungi alla schermata Home', false],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0', 'instagram', 'Apri nel browser', true],
]) {
  const ictx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, userAgent: ua, locale: 'it-IT', reducedMotion: 'reduce' });
  if (auto) await ictx.addInitScript(() => { if (!sessionStorage.getItem('t')) { localStorage.setItem('thelobby.usage', '296'); sessionStorage.setItem('t', '1'); } });
  const ip = await ictx.newPage();
  ip.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + e.message));
  await ip.route('**/*.supabase.co/**', mock);
  await ip.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ip.goto(base + '#/accedi');
  await ip.waitForSelector('.segmented');
  await ip.fill('input[type="email"]', 'giulia@example.com');
  await ip.fill('input[type="password"]', 'password456');
  await ip.click('button[type="submit"]');
  await ip.waitForSelector('.h-hello');
  if (auto) {
    await ip.waitForSelector('.install-pop', { timeout: 15000 });
  } else {
    await ip.waitForTimeout(1000);
    await check(ip.locator('.install-pop').count().then((n) => n === 0), `no pop-up at the start on ${label}`);
    await ip.click('.tabbar__item:has-text("Profilo")');
    await ip.click('.menu button:has-text("Aggiungi alla schermata Home")');
    await ip.waitForSelector('.install-pop');
  }
  await check(ip.textContent('.install-pop').then((t) => t.includes('Porta THE LOBBY sul telefono') && t.includes(expect)), `install steps on ${label}`);
  await ip.screenshot({ path: shots + `03c-install-${label}.png` });
  await ip.click('.install-pop__later');
  await ip.waitForSelector('.install-pop', { state: 'detached' });
  await ip.evaluate(() => localStorage.setItem('thelobby.usage', '400'));
  await ip.goto(base + '#/home');
  await ip.reload();
  await ip.waitForSelector('.h-hello');
  await ip.waitForTimeout(1500);
  await check(ip.locator('.install-pop').count().then((n) => n === 0), `«Non ora» keeps the pop-up away on ${label}`);
  await ictx.close();
}

await browser.close();
server.kill();
console.log(JSON.stringify({ failures, consoleErrors }, null, 2));
process.exit(failures.length || consoleErrors.length ? 1 : 0);
