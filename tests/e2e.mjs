// End-to-end check with Supabase mocked at the network layer (no real accounts or data touched).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');

const root = new URL('..', import.meta.url).pathname;
const shots = root + 'tests/shots/';
mkdirSync(shots, { recursive: true });
const PORT = 4173;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '-d', root + 'dist'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const uid = '11111111-1111-1111-1111-111111111111';
const course = {
  id: 'c1', slug: 'test-comune', title: '[TEST] Come funziona davvero un Comune', subtitle: 'Corso di prova per il prototipo',
  description: 'CORSO DI PROVA. Contenuto segnaposto per collaudare catalogo, player, progressi e quiz.', audience: null,
  level: 'base', access_level: 'free', objectives: ['Collaudare il flusso end-to-end', 'Capire chi decide in un Comune'],
  course_modules: [{ id: 'm1', position: 1, title: '[TEST] Modulo 1', description: null, lessons: [] }],
};
const lessons = [
  { id: 'l1', position: 1, title: '[TEST] Lezione 1', summary: 'Lezione di prova, senza video reale', duration_seconds: 60, status: 'published' },
  { id: 'l2', position: 2, title: '[TEST] Lezione 2', summary: 'Seconda lezione di prova', duration_seconds: 240, status: 'published' },
];
const course2 = {
  id: 'c2', slug: 'parlamento', title: 'Il Parlamento in 20 minuti', subtitle: 'Come nasce una legge', description: 'Mock', audience: null,
  level: 'intermedio', access_level: 'free', objectives: [], course_modules: [{ id: 'm2', position: 1, title: 'Le Camere', lessons: [] }],
};
let loggedIn = false;
let progress = [];
let attempts = [];
let waitlisted = false;
const taken = new Set(['andrea@example.com']);
const users = { 'andrea@example.com': 'password123' };
let failures = [];

function session(email, name = 'Andrea Bonazzi') {
  return {
    access_token: 'aaa.' + Buffer.from(JSON.stringify({ sub: uid, email })).toString('base64') + '.sig',
    refresh_token: 'r', expires_in: 3600, token_type: 'bearer',
    user: { id: uid, email, user_metadata: { full_name: name } },
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
    taken.add(body.email); users[body.email] = body.password; loggedIn = true;
    return json(200, session(body.email, body.data?.full_name));
  }
  if (path === '/auth/v1/token') {
    if (users[body.email] && users[body.email] === body.password) { loggedIn = true; return json(200, session(body.email)); }
    return json(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
  }
  if (path === '/auth/v1/logout') { loggedIn = false; return route.fulfill({ status: 204 }); }
  if (path === '/rest/v1/courses') {
    const withLessons = (c, ls) => ({ ...c, course_modules: c.course_modules.map((m) => ({ ...m, lessons: loggedIn ? ls : [] })) });
    const all = [withLessons(course, lessons), withLessons(course2, [{ id: 'p1', position: 1, title: 'Camera e Senato', duration_seconds: 300, status: 'published' }])];
    const slug = url.searchParams.get('slug');
    return json(200, slug ? all.filter((c) => 'eq.' + c.slug === slug) : all);
  }
  if (path === '/rest/v1/lessons') {
    const id = (url.searchParams.get('id') || '').replace('eq.', '');
    const l = lessons.find((x) => x.id === id);
    if (!l || !loggedIn) return json(200, []);
    return json(200, [{ ...l, video_ref: null, transcript: 'Trascrizione di prova.\nSeconda riga.', module_id: 'm1',
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
  if (path === '/rest/v1/rpc/my_plan') return json(200, { premium: false, waitlist: waitlisted });
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
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'it-IT' });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && !/fonts|ERR_|Failed to load resource/.test(m.text()) && consoleErrors.push(m.text()));
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + e.message));
await page.route('**/*.supabase.co/**', mock);
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());

const base = `http://localhost:${PORT}/`;
const shot = (n) => page.screenshot({ path: shots + n + '.png', fullPage: true });
const check = async (cond, msg) => { if (!(await cond)) failures.push('FAIL ' + msg); };

// 1. Welcome
await page.goto(base);
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
await check(page.textContent('.alert').then((t) => t.includes('già registrata')), 'email già registrata message');
await check(page.getAttribute('.segmented button[aria-selected="true"]', 'aria-selected').then(() => page.textContent('.segmented .is-on')).then((t) => t.trim() === 'Accedi'), 'switched to Accedi tab');
await shot('02-signup-email-taken');

// 3. Wrong password
await page.fill('input[type="password"]', 'sbagliata');
await page.click('button[type="submit"]');
await page.waitForSelector('.alert');
await check(page.textContent('.alert').then((t) => t.includes('non corretti')), 'wrong password message');

// 4. New signup -> Home
await page.click('.segmented button:has-text("Registrati")');
await page.fill('input[autocomplete="given-name"]', 'Giulia Rossi');
await page.fill('input[type="email"]', 'giulia@example.com');
await page.fill('input[autocomplete="new-password"] >> nth=0', 'password456');
await page.fill('input[autocomplete="new-password"] >> nth=1', 'password456');
await page.click('button[type="submit"]');
await page.waitForSelector('.h-hello');
await page.waitForSelector('.resume');
await check(page.textContent('.h-hello').then((t) => t.includes('Andrea') || t.includes('Giulia')), 'greeting with name');
await shot('03-home');

// 5. Academy
await page.click('.tabbar__item:has-text("Academy")');
await page.waitForSelector('.course-row');
await shot('04-academy');

// 6. Course
await page.click('.course-row >> nth=0');
await page.waitForSelector('.course-hero');
await shot('05-course');

// 7. Lesson + complete
await page.click('text=Inizia il corso');
await page.waitForSelector('.player');
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
await page.click('.chip--btn:has-text("Viaggio gratis")');
await check(page.locator('.opp-card').count().then((n) => n === 1), 'tag filter');

// 9b. Home shows the 3 free ones + Premium teaser
await page.click('.tabbar__item:has-text("Home")');
await page.waitForSelector('.teaser');
await check(page.locator('.opp-list li').count().then((n) => n === 3), 'home shows 3 free opportunities');
await shot('10b-home-opps');

// 9c. Premium page + waitlist
await page.click('.tabbar__item:has-text("Premium")');
await page.waitForSelector('.premium-hero');
await shot('10c-premium');
await page.click('button:has-text("Prenota il tuo posto")');
await page.waitForSelector('.premium-status');
await check(page.textContent('.premium-status').then((t) => t.includes('Posto prenotato a 12,90 €')), 'waitlist joined');
await shot('10d-premium-waitlist');

// 10. Profile + logout
await page.click('.tabbar__item:has-text("Profilo")');
await page.waitForSelector('.profile-head');
await page.waitForTimeout(300);
await shot('11-profile');
await page.click('button:has-text("Esci")');
await page.waitForSelector('.welcome__hero');
await check(page.evaluate(() => localStorage.getItem('thelobby.session') === null), 'session cleared on logout');

// 11. Protected route redirects to Accedi when logged out
await page.goto(base + '#/academy');
await page.waitForSelector('.segmented');
await shot('12-login');

await browser.close();
server.kill();
console.log(JSON.stringify({ failures, consoleErrors }, null, 2));
process.exit(failures.length || consoleErrors.length ? 1 : 0);
