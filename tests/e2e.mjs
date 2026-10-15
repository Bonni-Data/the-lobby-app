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
  const body = req.postDataJSON?.() ?? null;
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
  if (path === '/rest/v1/lessons') {
    const id = (url.searchParams.get('id') || '').replace('eq.', '');
    const l = lessons.find((x) => x.id === id);
    if (!l || !loggedIn) return json(200, []);
    return json(200, [{ ...l, video_ref: null, transcript: 'Trascrizione di prova.\n\n## Passi\n\n1. **Uno**: primo passo.\n2. Secondo passo.\n\n- Kit:\n  - CV\n  - SPID\n\n## In breve\n\n- Primo punto\n- Secondo punto', module_id: 'm1',
      course_modules: { id: 'm1', title: '[TEST] Modulo 1', position: 1, courses: { slug: 'test-comune', title: course.title } },
      quizzes: id === 'l1' ? [{ id: 'q1', title: '[TEST] Quiz lezione 1' }] : [], lesson_assets: [] }]);
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
  if (path === '/rest/v1/profiles') {
    if (req.method() === 'PATCH') return json(200, [{ id: uid, display_name: body.display_name }]);
    return json(200, [{ id: uid, display_name: 'Andrea Bonazzi' }]);
  }
  failures.push('UNMOCKED ' + req.method() + ' ' + path);
  return json(404, { message: 'not mocked' });
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: Number(process.env.VW || 390), height: Number(process.env.VH || 844) }, deviceScaleFactor: process.env.VW ? 1 : 2, locale: 'it-IT', reducedMotion: process.env.MOTION ? 'no-preference' : 'reduce' });
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
await page.fill('input[autocomplete="given-name"]', 'Andrea');
await page.fill('input[type="email"]', 'andrea@example.com');
await page.fill('input[autocomplete="new-password"] >> nth=0', 'qualcosa123');
await page.fill('input[autocomplete="new-password"] >> nth=1', 'qualcosa123');
await page.click('button[type="submit"]');
await page.waitForSelector('.alert');
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
await page.fill('input[autocomplete="given-name"]', 'Giulia Rossi');
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

// 5. Academy
await page.click('.tabbar__item:has-text("Academy")');
await page.waitForSelector('.course-row');
await page.waitForSelector('.preview');
await check(page.textContent('.preview').then((t) => t.includes('Come si legge un bando europeo')), 'premium course preview shows lesson titles');
await check(page.locator('.cat-section').count().then((n) => n === 4), 'courses grouped by area');
await check(page.textContent('.preview:has-text("Public speaking avanzato")').then((t) => t.includes('Live su Teams') && !t.includes('Fuori dalla zona di comfort')), 'live preview without programme');
await check(page.locator('.course-row .cover--small').count().then((n) => n > 0), 'light course covers');
await shot('04-academy');
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
await shot('05-course');

// 7. Lesson + complete
await page.click('text=Inizia il corso');
await page.waitForSelector('.lesson-cover');
await check(page.textContent('.lesson-text').then((t) => t.includes('Trascrizione di prova')), 'lesson text rendered');
await check(page.locator('.lesson-text ol li').count().then((n) => n === 2), 'numbered list rendered');
await check(page.locator('.lesson-text li > ul li').count().then((n) => n === 2), 'nested list rendered');
await page.click('text=Segna come completata');
await page.waitForSelector('text=Completata');
await shot('06-lesson');

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
  opp('o4', 'sviluppo', { locked: true, deadline: new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10) }),
  opp('o5', 'lavoro', { locked: true, deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) }),
];
await page.reload();
await page.waitForSelector('.opp-card');
await check(page.locator('.opp-card--locked').count().then((n) => n === 2), 'two locked cards');
await check(page.textContent('.nudge__title').then((t) => t.includes('Altre 2')), 'premium nudge count');
await shot('10-opps');
await page.click('.chip--btn:has-text("Viaggi")');
await check(page.locator('.opp-card').count().then((n) => n === 1), 'tag filter');

// 9b. Home shows the 3 free ones + Premium teaser
await page.click('.tabbar__item:has-text("Home")');
await page.waitForSelector('.teaser');
await check(page.locator('.opp-list li').count().then((n) => n === 3), 'home shows 3 free opportunities');
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
await page.fill('.apply input', 'https://linkedin.com/in/giulia');
await shot('10d-premium-form');
await page.click('button:has-text("Invia la candidatura")');
await page.waitForSelector('.apply-status .premium-status');
await check(page.textContent('.apply-status').then((t) => t.includes('Candidatura inviata')), 'application pending state');
await page.waitForTimeout(300);
await check(Promise.resolve(notified.length === 0), 'no third-party form service called');
await shot('10e-premium-pending');

// 9d. Admin review (Andrea's account)
isAdmin = true;
await page.reload();
await page.click('.tabbar__item:has-text("Profilo")');
await page.waitForSelector('text=Area founder');
await page.click('text=Area founder');
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
await check(page.textContent('.live-meter').then((t) => t.includes('14') && t.includes('15')), 'live counter before booking');
await check(page.locator('.modules--live li').count().then((n) => n === 1), 'live programme visible to Premium');
await shot('10g4-live-premium');
await page.click('.live-panel button:has-text("Prenota il tuo posto")');
await page.waitForSelector('.live-panel__badge:has-text("Sei iscritto")');
await check(page.textContent('.live-meter').then((t) => /15\s*\/\s*15/.test(t)), 'live counter after booking');
await check(page.textContent('.live-panel').then((t) => t.includes('Andrea sta fissando la data')), 'minimum reached message');
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
await page.goto(base + '#/academy');
await page.waitForSelector('.academy-premium');
await check(page.locator('.preview').count().then((n) => n === 0), 'no preview when premium');
approved = false;

// 10. Profile + logout
await page.click('.tabbar__item:has-text("Profilo")');
await page.waitForSelector('.profile-head');
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

await browser.close();
server.kill();
console.log(JSON.stringify({ failures, consoleErrors }, null, 2));
process.exit(failures.length || consoleErrors.length ? 1 : 0);
