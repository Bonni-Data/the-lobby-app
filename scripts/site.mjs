// THE LOBBY · indexable public pages.
// Builds static HTML for Google (path, courses, lessons, opportunities, founder, neutrality), plus sitemap.xml and robots.txt,
// from the public data the database exposes to everyone (public.public_site: no personal data).
//
//   node scripts/site.mjs --out <dir> [--data <file.json>] [--posts <the-lobby-posts checkout>]
//
// With --posts it also builds one page per «Dietro la notizia» (history-notizie.json + data/notizia-<date>.json, the same
// verified texts published on Instagram at 8:00), so people who search a news story on Google find the explanation.
//
// Without --data it fetches the data from Supabase with the public anon key (used by the daily GitHub Action).
// Pure Node, no dependencies.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { slugify, oppSlug, newsSlug } from './shared.mjs';

const SITE = 'https://thelobbyitalia.it';
const SUPABASE_URL = 'https://unyqeshkfkvijehnlnex.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueXFlc2hrZmt2aWplaG5sbmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NDk4MjUsImV4cCI6MjEwNzMyNTgyNX0.eOZvjG6R0B_35bk1KBYFtVu3IqUiT3EBLmBYqGtJnPU';
const INSTAGRAM = 'https://www.instagram.com/thelobbyitalia/';
export const INDEXNOW_KEY = '7f3c9a1e5b2d4c8f9e0a6b1c2d3e4f50';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const OUT = opt('--out') || 'dist';
const DATA = opt('--data');
const POSTS = opt('--posts');

/* ---------- helpers ---------- */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const strip = (s) => String(s ?? '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
const clip = (s, n) => { const t = strip(s); return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
function itDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
const ymd = (iso) => String(iso || new Date().toISOString()).slice(0, 10);

/** The same tiny dialect as the app: "## " headings, "- " / "1. " lists with "  - " sub-items, **bold**, blank-line paragraphs. */
function prose(text) {
  const inline = (t) => esc(t).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const blocks = String(text || '').replace(/\r/g, '').split(/\n{2,}/).map((b) => b.replace(/^\n+|\s+$/g, '')).filter((b) => b.trim());
  const out = [];
  for (const b of blocks) {
    let lines = b.split('\n');
    if (lines[0].startsWith('## ')) {
      out.push(`<h2>${inline(lines[0].slice(3).trim())}</h2>`);
      lines = lines.slice(1);
      if (!lines.length) continue;
    }
    let list = null;
    let para = [];
    const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
    const flushList = () => {
      if (!list) return;
      out.push(`<${list.kind}>${list.items.map((it) => `<li>${inline(it.text)}${it.sub.length ? `<ul>${it.sub.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</${list.kind}>`);
      list = null;
    };
    for (const line of lines) {
      if (/^\s+- /.test(line) && list) list.items[list.items.length - 1].sub.push(line.replace(/^\s+- /, ''));
      else if (/^- /.test(line) || /^\d+\.\s/.test(line)) {
        flushPara();
        const kind = /^- /.test(line) ? 'ul' : 'ol';
        if (!list || list.kind !== kind) { flushList(); list = { kind, items: [] }; }
        list.items.push({ text: line.replace(/^- |^\d+\.\s/, ''), sub: [] });
      } else {
        flushList();
        para.push(line.trim());
      }
    }
    flushPara();
    flushList();
  }
  return out.join('\n');
}

const ORG = {
  '@type': 'Organization',
  '@id': `${SITE}/#org`,
  name: 'THE LOBBY',
  alternateName: ['THE LOBBY Italia', 'The Lobby Academy'],
  url: `${SITE}/`,
  logo: `${SITE}/icons/icon-512.png`,
  sameAs: [INSTAGRAM],
  founder: { '@type': 'Person', name: 'Andrea Bonazzi', url: `${SITE}/andrea/` },
};

const CATS = { europa: 'Europa', italia: 'Italia', comune: 'Comune', skill: 'Skill personali', attualita: 'Attualità' };
const LEVEL = { base: 'Base', intermedio: 'Intermedio', avanzato: 'Avanzato' };
const TAG = { viaggio: 'Viaggio spesato', lavoro: 'Lavoro', sviluppo: 'Sviluppo' };
const KIND = { bando: 'Bando', tirocinio: 'Tirocinio', lavoro: 'Lavoro', evento: 'Evento', finanziamento: 'Finanziamento', formazione: 'Formazione', volontariato: 'Volontariato', concorso: 'Concorso', programma: 'Programma' };

const ARCH = '<svg class="s-arch" viewBox="0 0 24 30" aria-hidden="true"><path d="M3 29V12a9 9 0 0 1 18 0v17" fill="none" stroke="#FF7058" stroke-width="3" stroke-linecap="round"/></svg>';

function page({ path, title, description, body, crumbs = [], jsonld = [], type = 'website', stamp }) {
  const url = SITE + path;
  const ld = [...jsonld];
  if (crumbs.length) {
    ld.push({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [{ name: 'THE LOBBY', path: '/' }, ...crumbs].map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: SITE + c.path })),
    });
  }
  const crumbHtml = crumbs.length
    ? `<nav class="s-crumbs" aria-label="Sei qui"><a href="/">THE LOBBY</a>${crumbs.map((c, i) => i === crumbs.length - 1 ? ` <span>/</span> <span aria-current="page">${esc(c.name)}</span>` : ` <span>/</span> <a href="${c.path}">${esc(c.name)}</a>`).join('')}</nav>`
    : '';
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="THE LOBBY">
<meta property="og:locale" content="it_IT">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/img/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#111C35">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="96x96" href="/icons/favicon-96.png">
<link rel="icon" type="image/png" sizes="192x192" href="/icons/favicon-192.png">
<link rel="icon" type="image/svg+xml" href="/icons/favicon.svg">
<link rel="apple-touch-icon" href="/icons/icon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/site.css?v=${stamp}">
${ld.map((x) => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...x }).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>
<header class="s-top">
  <a class="s-brand" href="/" aria-label="THE LOBBY, home">${ARCH}<span>THE LOBBY</span></a>
  <a class="s-btn s-btn--sm" href="/#/accedi?tab=registrati" data-cta="top">Entra gratis</a>
</header>
${crumbHtml}
<main class="s-main">
${body}
</main>
<footer class="s-foot">
  <nav aria-label="Esplora">
    <a href="/percorso/">Il percorso</a><a href="/corsi/">I corsi</a><a href="/opportunita/">Opportunità</a><a href="/notizie/">Notizie spiegate</a><a href="/docenti/">Per i docenti</a><a href="/andrea/">Chi è Andrea?</a><a href="/neutralita/">Neutralità</a>
  </nav>
  <nav aria-label="Note legali"><a href="/#/privacy">Privacy</a><a href="/#/termini">Termini</a><a href="${INSTAGRAM}" rel="noopener">Instagram</a></nav>
  <p>THE LOBBY · l'academy gratuita su Comuni, Parlamento ed Europa, fondata da Andrea Bonazzi. Non è affiliata ad alcun partito.</p>
</footer>
<script>
(function () {
  function t(name, props) {
    try {
      fetch('${SUPABASE_URL}/rest/v1/rpc/track', { method: 'POST', keepalive: true,
        headers: { apikey: '${ANON}', Authorization: 'Bearer ${ANON}', 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_name: name, p_path: location.pathname.slice(0, 120), p_props: props || {} }) }).catch(function () {});
    } catch (e) {}
  }
  t('visit', { page: 'static' });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-cta]');
    if (a) t('public_cta', { cta: a.getAttribute('data-cta') });
  });
})();
</script>
</body>
</html>
`;
}

function cta(text = 'Crea il tuo account gratis', sub = 'Segui il percorso, salva i progressi, fai i quiz e ricevi ogni lunedì le opportunità della settimana.', name = 'box') {
  return `<aside class="s-cta">
  <p class="s-cta__title">${esc(text)}</p>
  <p>${esc(sub)}</p>
  <a class="s-btn" href="/#/accedi?tab=registrati" data-cta="${name}">Entra nella Lobby, è gratis</a>
  <a class="s-cta__alt" href="/#/accedi" data-cta="${name}-login">Hai già un account? Accedi</a>
</aside>`;
}

/* ---------- build ---------- */
async function load() {
  if (DATA) return JSON.parse(readFileSync(DATA, 'utf8'));
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_site`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) throw new Error(`public_site ${res.status}: ${await res.text()}`);
  return res.json();
}

function write(rel, html) {
  const file = join(OUT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

const data = await load();
const stamp = Date.now().toString(36);
const today = ymd(data.generated_at);
const courses = (data.courses || []).filter((c) => !String(c.slug).startsWith('test-'));
const bySlug = new Map(courses.map((c) => [c.slug, c]));
const stages = data.stages || [];
const stageOf = new Map();
stages.forEach((st) => (st.courses || []).forEach((x) => stageOf.set(x.slug, { st, optional: x.optional })));
const freeStages = stages.filter((s) => !s.premium);
const urls = []; // [path, lastmod, priority]

// Lesson slugs, unique inside each course.
for (const c of courses) {
  const seen = new Set();
  c.lessons = [];
  for (const m of c.modules || []) {
    for (const l of m.lessons || []) {
      let s = slugify(l.title) || 'lezione';
      while (seen.has(s)) s += '-2';
      seen.add(s);
      l.slug = s;
      l.module = m.title;
      c.lessons.push(l);
    }
  }
  c.minutes = c.lessons.reduce((n, l) => n + (Number(l.minutes) || 0), 0);
}

const courseUrl = (c) => `/corsi/${c.slug}/`;
const lessonUrl = (c, l) => `/corsi/${c.slug}/${l.slug}/`;
function courseTags(c) {
  const t = [];
  t.push(c.access === 'premium' ? (c.format === 'live' ? 'Live · Premium' : 'Premium') : 'Gratis');
  t.push(LEVEL[c.level] || 'Base');
  if (c.format !== 'live' && c.lessons.length) t.push(`${c.lessons.length} lezioni · ${Math.max(1, c.minutes)} min`);
  return t;
}
function courseCard(c, extra = '') {
  return `<li class="s-course">
  <a href="${courseUrl(c)}">
    <span class="s-course__tags">${courseTags(c).map((x, i) => `<em${i === 0 && c.access === 'free' ? ' class="is-free"' : ''}>${esc(x)}</em>`).join('')}${extra}</span>
    <strong>${esc(c.title)}</strong>
    ${c.subtitle ? `<span>${esc(c.subtitle)}</span>` : ''}
  </a>
</li>`;
}

// ----- /percorso/
{
  let n = 0;
  const body = `
<section class="s-hero">
  <span class="s-kicker">Il percorso consigliato</span>
  <h1>Da cittadino a protagonista</h1>
  <p class="s-lede">${freeStages.length} tappe gratuite per capire come funzionano davvero Comuni, Parlamento ed Europa, e per entrarci. Ogni tappa ti dà una competenza; puoi saltare dove vuoi, ma se parti dall'inizio non ti perdi niente.</p>
  <a class="s-btn" href="/#/accedi?tab=registrati" data-cta="percorso-hero">Inizia il percorso gratis</a>
</section>
<ol class="s-stages">
${stages.map((st) => {
  if (!st.premium) n += 1;
  const list = (st.courses || []).map((x) => bySlug.get(x.slug) ? { c: bySlug.get(x.slug), optional: x.optional } : null).filter(Boolean);
  return `<li class="s-stage${st.premium ? ' is-premium' : ''}" id="tappa-${esc(st.id)}">
  <span class="s-stage__n" aria-hidden="true">${st.premium ? '★' : n}</span>
  <div>
    <span class="s-kicker">${st.premium ? 'Tappa extra · Premium, gratuito su selezione' : `Tappa ${n}`}</span>
    <h2>${esc(st.title)}</h2>
    <p class="s-skill">Competenza: <strong>${esc(st.skill)}</strong></p>
    ${st.summary ? `<p>${esc(st.summary)}</p>` : ''}
    
    <ul class="s-courses">${list.map((x) => courseCard(x.c, x.optional ? '<em>Facoltativo</em>' : '')).join('')}</ul>
  </div>
</li>`;
}).join('\n')}
</ol>
${cta('Il percorso è gratis', 'Crea l’account in un minuto: salvi i progressi, fai i quiz, guadagni i traguardi e ricevi il certificato a fine corso.', 'percorso')}`;
  write('percorso/index.html', page({
    path: '/percorso/', stamp,
    title: 'Il percorso: da cittadino a protagonista · THE LOBBY',
    description: `${freeStages.length} tappe gratuite per capire Comuni, Parlamento ed Europa e iniziare a contare: lezioni da 5 minuti, quiz e simulazioni. Il percorso di THE LOBBY, gratis.`,
    crumbs: [{ name: 'Il percorso', path: '/percorso/' }],
    jsonld: [{ '@type': 'ItemList', name: 'Da cittadino a protagonista', itemListElement: stages.flatMap((st) => st.courses || []).map((x, i) => bySlug.get(x.slug) && ({ '@type': 'ListItem', position: i + 1, url: SITE + courseUrl(bySlug.get(x.slug)), name: bySlug.get(x.slug).title })).filter(Boolean) }],
    body,
  }));
  urls.push(['/percorso/', today, '0.9']);
}

// ----- /corsi/
{
  const groups = Object.entries(CATS).map(([id, label]) => ({ id, label, items: courses.filter((c) => (c.category || 'italia') === id) })).filter((g) => g.items.length);
  const body = `
<section class="s-hero">
  <span class="s-kicker">Academy</span>
  <h1>I corsi di THE LOBBY</h1>
  <p class="s-lede">Corsi brevi e gratuiti su come funzionano davvero le istituzioni, dal Comune all'Unione europea, e sulle competenze per muoverti dentro: lezioni da cinque minuti, quiz e simulazioni finali. I corsi di attualità (intelligenza artificiale, legge elettorale, clima, lavoro, fisco, casa, migrazioni, sanità, Europa e digitale) si aggiornano il 1° di ogni mese con le nuove leggi. In Premium, gratuito su selezione, ci sono solo le lezioni live su Teams con Andrea e le cene di networking.</p>
  <a class="s-btn s-btn--ghost" href="/percorso/">Guarda il percorso consigliato</a>
</section>
${groups.map((g) => `<section class="s-group"><h2>${esc(g.label)}</h2><ul class="s-courses">${g.items.map((c) => courseCard(c)).join('')}</ul></section>`).join('\n')}
${cta()}`;
  write('corsi/index.html', page({
    path: '/corsi/', stamp,
    title: 'Corsi gratuiti su Comune, Parlamento ed Europa · THE LOBBY',
    description: 'Tutti i corsi di THE LOBBY: come funziona il Comune, come nasce una legge, i conti dello Stato, l’Europa, il public speaking e le opportunità per i giovani. Gratis.',
    crumbs: [{ name: 'Corsi', path: '/corsi/' }],
    jsonld: [{ '@type': 'ItemList', name: 'I corsi di THE LOBBY', itemListElement: courses.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + courseUrl(c), name: c.title })) }],
    body,
  }));
  urls.push(['/corsi/', today, '0.9']);
}

// ----- /corsi/<slug>/ and lessons
for (const c of courses) {
  const where = stageOf.get(c.slug);
  const stageN = where && !where.st.premium ? freeStages.indexOf(where.st) + 1 : null;
  const live = c.format === 'live';
  const lastmod = ymd(c.updated_at);
  const body = `
<section class="s-hero">
  ${where ? `<a class="s-stagechip" href="/percorso/#tappa-${esc(where.st.id)}">${where.st.premium ? 'Tappa extra · Dal vivo con Andrea' : `Tappa ${stageN} del percorso · ${esc(where.st.title)}`}${where.optional ? ' · facoltativo' : ''}</a>` : ''}
  <span class="s-kicker">${esc(CATS[c.category] || 'Italia')} · ${esc(LEVEL[c.level] || 'Base')}${live ? ' · Live su Teams' : ''}</span>
  <h1>${esc(c.title)}</h1>
  ${c.subtitle ? `<p class="s-lede">${esc(c.subtitle)}</p>` : ''}
  <p class="s-meta">${live ? 'Masterclass dal vivo con Andrea Bonazzi su Microsoft Teams, riservata a Premium (gratuito, su selezione).' : `${c.lessons.length} lezioni · circa ${Math.max(1, c.minutes)} minuti · ${c.access === 'free' ? 'gratis' : 'Premium'} · con Andrea Bonazzi`}</p>
  <a class="s-btn" href="/#/accedi?tab=registrati" data-cta="corso-hero">${live ? 'Entra nella Lobby' : 'Inizia il corso gratis'}</a>
</section>
${c.description ? `<p class="s-text">${esc(c.description)}</p>` : ''}
${(c.objectives || []).length ? `<section class="s-box"><h2>Alla fine saprai</h2><ul class="s-goals">${c.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></section>` : ''}
${c.lessons.length ? `<section class="s-program"><h2>Programma</h2>${(c.modules || []).map((m) => `<h3>${esc(m.title)}</h3><ol class="s-lessons">${(m.lessons || []).map((l) => `<li><a href="${lessonUrl(c, l)}"><strong>${esc(l.title)}</strong>${l.summary ? `<span>${esc(l.summary)}</span>` : ''}<em>${Math.max(1, Number(l.minutes) || 1)} min</em></a></li>`).join('')}</ol>`).join('')}</section>` : ''}
${live ? cta('Le masterclass sono in Premium', 'Premium è gratuito: ti candidi raccontando il tuo percorso e Andrea valuta personalmente ogni candidatura. Intanto il percorso base è tutto aperto.', 'corso-live') : cta()}`;
  const jsonCourse = {
    '@type': 'Course', name: c.title, description: clip(c.description || c.subtitle || c.title, 300), url: SITE + courseUrl(c),
    inLanguage: 'it', provider: { '@id': `${SITE}/#org` }, isAccessibleForFree: c.access === 'free', educationalLevel: LEVEL[c.level] || 'Base',
    ...(c.objectives?.length ? { teaches: c.objectives } : {}),
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'Online', ...(live ? {} : { courseWorkload: `PT${Math.max(1, c.minutes)}M` }), instructor: { '@type': 'Person', name: 'Andrea Bonazzi', url: `${SITE}/andrea/` } },
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR', category: 'Free', availability: 'https://schema.org/InStock', url: SITE + courseUrl(c) },
  };
  write(`corsi/${c.slug}/index.html`, page({
    path: courseUrl(c), stamp,
    title: `${c.title} · corso gratuito · THE LOBBY`.replace(' · corso gratuito', c.access === 'free' ? ' · corso gratuito' : ''),
    description: clip(`${c.subtitle || ''} ${c.description || ''}`, 158) || c.title,
    crumbs: [{ name: 'Corsi', path: '/corsi/' }, { name: c.title, path: courseUrl(c) }],
    jsonld: [{ ...ORG }, jsonCourse],
    body,
  }));
  urls.push([courseUrl(c), lastmod, '0.8']);

  c.lessons.forEach((l, i) => {
    const prev = c.lessons[i - 1];
    const next = c.lessons[i + 1];
    const free = c.access === 'free' && l.excerpt;
    const sources = Array.isArray(l.sources) ? l.sources.filter((x) => x && x.url) : [];
    const updated = l.reviewed_at || l.updated_at;
    const lbody = `
<article class="s-lesson">
  <span class="s-kicker">${esc(c.title)} · lezione ${i + 1} di ${c.lessons.length} · ${Math.max(1, Number(l.minutes) || 1)} minuti</span>
  <h1>${esc(l.title)}</h1>
  ${l.summary ? `<p class="s-lede">${esc(l.summary)}</p>` : ''}
  <p class="s-meta">Con Andrea Bonazzi${updated ? ` · ${l.reviewed_at ? 'ricontrollata sulle fonti il' : 'aggiornata il'} ${itDate(updated)}` : ''}</p>
  ${free ? `<div class="s-prose">${prose(l.excerpt)}</div>
  <div class="s-fade" aria-hidden="true"></div>
  <aside class="s-cta s-cta--inline">
    <p class="s-cta__title">Continua a leggere, è gratis</p>
    <p>Il resto della lezione, le sfide e il quiz sono nell'app. Ti serve solo un account: un minuto e sei dentro.</p>
    <a class="s-btn" href="/#/accedi?tab=registrati" data-cta="lezione">Crea l'account e continua</a>
    <a class="s-cta__alt" href="/#/lezione/${esc(l.id)}" data-cta="lezione-login">Hai già un account? Apri la lezione</a>
  </aside>` : `<p class="s-text">${c.format === 'live' ? 'Questa lezione fa parte di una masterclass dal vivo con Andrea, riservata a Premium (gratuito, su selezione).' : 'Questa lezione è nell’app di THE LOBBY.'}</p>${cta()}`}
  ${sources.length ? `<section class="s-sources"><h2>Fonti</h2><ul>${sources.map((x) => `<li><a href="${esc(x.url)}" rel="noopener">${esc(x.title || x.url)}</a></li>`).join('')}</ul></section>` : ''}
  <nav class="s-pager" aria-label="Altre lezioni">
    ${prev ? `<a href="${lessonUrl(c, prev)}"><small>Lezione precedente</small>${esc(prev.title)}</a>` : '<span></span>'}
    ${next ? `<a href="${lessonUrl(c, next)}" class="is-next"><small>Prossima lezione</small>${esc(next.title)}</a>` : `<a href="${courseUrl(c)}" class="is-next"><small>Fine del corso</small>Torna al programma</a>`}
  </nav>
</article>`;
    write(`corsi/${c.slug}/${l.slug}/index.html`, page({
      path: lessonUrl(c, l), stamp, type: 'article',
      title: `${l.title} · ${c.title} · THE LOBBY`,
      description: clip(l.summary || l.excerpt || l.title, 158),
      crumbs: [{ name: 'Corsi', path: '/corsi/' }, { name: c.title, path: courseUrl(c) }, { name: l.title, path: lessonUrl(c, l) }],
      jsonld: [{
        '@type': 'LearningResource', name: l.title, description: clip(l.summary || l.title, 300), url: SITE + lessonUrl(c, l), inLanguage: 'it',
        isAccessibleForFree: c.access === 'free', learningResourceType: 'Lezione', timeRequired: `PT${Math.max(1, Number(l.minutes) || 1)}M`,
        author: { '@type': 'Person', name: 'Andrea Bonazzi', url: `${SITE}/andrea/` }, publisher: { '@id': `${SITE}/#org` },
        isPartOf: { '@type': 'Course', name: c.title, url: SITE + courseUrl(c) }, ...(updated ? { dateModified: updated } : {}),
      }],
      body: lbody,
    }));
    urls.push([lessonUrl(c, l), ymd(updated || c.updated_at), '0.6']);
  });
}

// ----- /opportunita/ and one page per opportunity
// Each opportunity gets its own page (shareable, indexable). Traineeships, jobs and EU competitions with a known city also
// carry JobPosting data, so they can appear in Google's job search (Google Jobs, active in Italy). Google's rules for job
// sites: one posting per page, the title as the organisation wrote it, the details visible on the page, expired postings
// gone (expired opportunities leave the feed every morning, so their page disappears and answers 404).
const COUNTRY = [
  [/bruxelles|belgio|bruges/i, 'BE'], [/lussemburgo/i, 'LU'], [/strasburgo|parigi|francia/i, 'FR'],
  [/firenze|roma|milano|torino|napoli|bologna|venezia|genova|ispra|\bitalia\b/i, 'IT'], [/francoforte|berlino|monaco di baviera|germania/i, 'DE'],
  [/madrid|torrej[oó]n|spagna|barcellona/i, 'ES'], [/ginevra|svizzera|zurigo|berna/i, 'CH'], [/varsavia|natolin|lublino|polonia/i, 'PL'],
  [/vienna|austria/i, 'AT'], [/l'aia|\baia\b|paesi bassi|amsterdam/i, 'NL'], [/lisbona|portogallo/i, 'PT'], [/stati uniti|new york|washington/i, 'US'],
  [/atene|grecia/i, 'GR'], [/dublino|irlanda/i, 'IE'], [/copenaghen|danimarca/i, 'DK'], [/stoccolma|svezia/i, 'SE'], [/helsinki|finlandia/i, 'FI'],
];
function jobPlaces(location) {
  if (!location || /online|remoto|varie|da definire|estero/i.test(location)) return [];
  // top-level parts, ignoring separators inside parentheses: "Istituzioni UE (Bruxelles, Lussemburgo)", "Torrejón de Ardoz (Madrid)"
  const parts = [];
  let depth = 0, cur = '';
  const src = String(location);
  for (let i = 0; i < src.length; i++) {
    const ch = src.charAt(i);
    if (ch === '(') depth += 1;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && (ch === ',' || /^\s(e|o)\s/i.test(src.slice(i, i + 3)))) { parts.push(cur); cur = ''; if (ch !== ',') i += 2; continue; }
    cur += ch;
  }
  parts.push(cur);
  const out = [];
  const add = (txt) => {
    const city = txt.trim();
    const hit = COUNTRY.find(([re]) => re.test(city));
    if (!hit || !city || /^(uffici|altre|sedi|istituzioni)/i.test(city)) return false;
    out.push({ '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: city, addressCountry: hit[1] } });
    return true;
  };
  for (const part of parts.map((x) => x.trim()).filter(Boolean)) {
    const inner = (part.match(/\(([^)]*)\)/) || [])[1];
    const outer = part.replace(/\(.*?\)/g, '').trim();
    if (!add(outer) && inner) inner.split(/,|\s+e\s+|\s+o\s+/i).forEach(add);
  }
  return out;
}
const JOB_KINDS = new Set(['tirocinio', 'lavoro', 'concorso']);
const oppUrl = (o) => `/opportunita/${oppSlug(o)}/`;
{
  const opps = data.opportunities || [];
  const notOpen = (o) => o.opens_on && o.opens_on > today;
  const when = (o) => notOpen(o) ? itDate(o.opens_on) : o.deadline ? `${itDate(o.deadline)}${o.deadline_note ? ` · ${esc(o.deadline_note)}` : ''}` : 'candidature sempre aperte';
  const facts = (o) => `<dl>
    ${o.covered ? `<dt>Offerto dall'ente</dt><dd>${esc(o.covered)}</dd>` : ''}
    ${o.requirements ? `<dt>Requisiti</dt><dd>${esc(o.requirements)}</dd>` : ''}
    <dt>${notOpen(o) ? 'Apre il' : 'Scadenza'}</dt><dd>${when(o)}</dd>
  </dl>`;
  const card = (o) => `<li class="s-opp s-opp--${esc(o.tag)}">
  <span class="s-opp__tags"><em>${esc(TAG[o.tag] || 'Opportunità')}</em>${o.category ? `<em>${esc(KIND[o.category] || o.category)}</em>` : ''}</span>
  <h2><a href="${oppUrl(o)}">${esc(o.title)}</a></h2>
  ${o.organization ? `<p class="s-opp__org">${esc(o.organization)}${o.location ? ` · ${esc(o.location)}` : ''}</p>` : ''}
  ${o.summary ? `<p>${esc(o.summary)}</p>` : ''}
  ${facts(o)}
  ${o.url ? `<a class="s-btn s-btn--ghost" href="${esc(o.url)}" rel="noopener" target="_blank">Candidati sul sito ufficiale</a>` : ''}
</li>`;
  const body = `
<section class="s-hero">
  <span class="s-kicker">Aggiornate ogni mattina alle 7 · ${opps.length} aperte oggi</span>
  <h1>Opportunità per giovani: bandi, tirocini e viaggi spesati</h1>
  <p class="s-lede">Tirocini nelle istituzioni europee, viaggi con spese coperte verso eventi di ONU e Unione europea, concorsi, volontariato e programmi per crescere. Le cerchiamo ogni giorno sulle fonti ufficiali e le mettiamo in un solo posto, gratis.</p>
  <a class="s-btn" href="/#/opportunita" data-cta="opps-app">Apri le opportunità nell'app</a>
</section>
<ul class="s-opps">${opps.map(card).join('\n')}</ul>
<p class="s-note">Aggiornato il ${itDate(today)}. THE LOBBY non organizza né finanzia queste opportunità: le cerca e le raccoglie dalle fonti ufficiali. Viaggi, rimborsi e borse sono offerti dagli enti che le pubblicano, secondo i loro bandi. Prima di candidarti verifica sempre i dettagli sulla pagina ufficiale.</p>
${cta('Ricevile ogni lunedì', 'Con l’account gratuito ti arrivano ogni lunedì le opportunità della settimana, e intanto segui il percorso dell’Academy.', 'opps')}`;
  write('opportunita/index.html', page({
    path: '/opportunita/', stamp,
    title: `Opportunità per giovani: bandi UE, tirocini e viaggi spesati (${opps.length} aperte) · THE LOBBY`,
    description: 'Bandi, tirocini al Parlamento europeo, concorsi EPSO, volontariato e viaggi con spese coperte dagli enti: le opportunità per giovani aperte oggi, verificate sulle fonti ufficiali. Gratis.',
    crumbs: [{ name: 'Opportunità', path: '/opportunita/' }],
    jsonld: [{ '@type': 'ItemList', name: 'Opportunità per giovani aperte oggi', itemListElement: opps.map((o, i) => ({ '@type': 'ListItem', position: i + 1, name: o.title, url: SITE + oppUrl(o) })) }],
    body,
  }));
  urls.push(['/opportunita/', today, '0.9']);

  for (const o of opps) {
    const path = oppUrl(o);
    const places = jobPlaces(o.location);
    const isJob = JOB_KINDS.has(o.category) && places.length && !notOpen(o) && o.summary && o.organization;
    const related = opps.filter((x) => x.id !== o.id && x.tag === o.tag).slice(0, 3);
    const checked = o.checked_at ? itDate(o.checked_at) : '';
    const descHtml = [
      o.summary && `<p>${esc(o.summary)}</p>`,
      o.requirements && `<p><strong>Requisiti:</strong> ${esc(o.requirements)}</p>`,
      o.covered && `<p><strong>Offerto dall'ente:</strong> ${esc(o.covered)}</p>`,
      o.location && `<p><strong>Dove:</strong> ${esc(o.location)}</p>`,
      `<p><strong>${notOpen(o) ? 'Apre il' : 'Scadenza'}:</strong> ${when(o)}</p>`,
      o.url && `<p>Ci si candida sul sito ufficiale di ${esc(o.organization || 'chi pubblica il bando')}: ${esc(o.url)}</p>`,
    ].filter(Boolean).join('');
    const jsonld = [];
    if (isJob) {
      let origin = '';
      try { origin = new URL(o.url).origin; } catch { origin = ''; }
      jsonld.push({
        '@type': 'JobPosting', title: o.title, description: descHtml, datePosted: ymd(o.created_at || today),
        ...(o.deadline ? { validThrough: `${o.deadline}T23:59:00+01:00` } : {}),
        ...(o.category === 'tirocinio' ? { employmentType: 'INTERN' } : {}),
        hiringOrganization: { '@type': 'Organization', name: o.organization, ...(origin ? { sameAs: origin } : {}) },
        jobLocation: places.length === 1 ? places[0] : places,
        directApply: false, url: SITE + path,
      });
    }
    const obody = `
<article class="s-lesson">
  <span class="s-kicker">${esc(TAG[o.tag] || 'Opportunità')}${o.category ? ` · ${esc(KIND[o.category] || o.category)}` : ''}</span>
  <h1>${esc(o.title)}</h1>
  ${o.organization ? `<p class="s-lede">${esc(o.organization)}${o.location ? ` · ${esc(o.location)}` : ''}</p>` : ''}
  ${o.summary ? `<p class="s-text">${esc(o.summary)}</p>` : ''}
  <div class="s-opp s-opp--${esc(o.tag)} s-opp--page">${facts(o)}
  ${o.url ? `<a class="s-btn" href="${esc(o.url)}" rel="noopener" target="_blank" data-cta="opp-ufficiale">Candidati sul sito ufficiale</a>` : ''}</div>
  <p class="s-note">${checked ? `Ricontrollata sulla fonte ufficiale il ${checked}. ` : ''}THE LOBBY non organizza né finanzia questa opportunità: la raccoglie dalla fonte ufficiale${o.source ? ` (${esc(o.source)})` : ''}. Viaggi, rimborsi, borse e compensi sono offerti dall'ente che la pubblica. Prima di candidarti verifica sempre i dettagli sulla pagina ufficiale.</p>
  ${related.length ? `<section class="s-box"><h2>Altre opportunità come questa</h2><ul class="s-goals">${related.map((x) => `<li><a href="${oppUrl(x)}">${esc(x.title)}</a>${x.deadline ? ` · scade il ${itDate(x.deadline)}` : ''}</li>`).join('')}</ul><p><a href="/opportunita/">Tutte le ${opps.length} opportunità aperte oggi</a></p></section>` : ''}
</article>
${cta('Non perderti le prossime', 'Con l’account gratuito ti arrivano ogni lunedì le opportunità della settimana, verificate sulle fonti ufficiali. E intanto impari come funzionano Comune, Stato ed Europa.', 'opp-page')}`;
    write(`opportunita/${oppSlug(o)}/index.html`, page({
      path, stamp,
      title: `${o.title}${o.deadline ? ` · scadenza ${itDate(o.deadline)}` : ''} · THE LOBBY`,
      description: clip(`${o.summary || o.title} ${o.requirements ? `Requisiti: ${o.requirements}.` : ''}`, 158),
      crumbs: [{ name: 'Opportunità', path: '/opportunita/' }, { name: o.title, path }],
      jsonld, body: obody,
    }));
    urls.push([path, ymd(o.checked_at || o.created_at || today), '0.7']);
  }
}

// ----- /notizie/ : «Dietro la notizia», one page per day
{
  const news = [];
  if (POSTS && existsSync(join(POSTS, 'history-notizie.json'))) {
    const hist = JSON.parse(readFileSync(join(POSTS, 'history-notizie.json'), 'utf8'));
    for (const [date, h] of Object.entries(hist)) {
      const f = join(POSTS, 'data', `notizia-${date}.json`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !existsSync(f)) continue;
      try {
        const n = JSON.parse(readFileSync(f, 'utf8'));
        if (!n.title || !Array.isArray(n.slides) || !n.slides.length) continue;
        news.push({ date, ...n, h, slug: newsSlug(date, n.title) });
      } catch { /* a malformed file never breaks the other pages */ }
    }
  }
  news.sort((a, b) => b.date.localeCompare(a.date));
  const newsUrl = (n) => `/notizie/${n.slug}/`;
  const lessonFor = (n) => {
    const c = n.h?.course && bySlug.get(n.h.course);
    const l = c && n.h.lesson && c.lessons.find((x) => x.title === n.h.lesson);
    return c && l ? { c, l } : c ? { c } : null;
  };
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
  for (const n of news) {
    const link = lessonFor(n);
    const fonti = (n.h?.fonti || []).filter((u) => /^https?:\/\//.test(u));
    const nbody = `
<article class="s-lesson">
  <span class="s-kicker">Dietro la notizia · ${itDate(n.date)}</span>
  <h1>${esc(n.title)}</h1>
  ${n.subtitle ? `<p class="s-lede">${esc(n.subtitle)}</p>` : ''}
  <div class="s-prose">
  ${n.slides.map((x) => `${x.tag ? `<p class="s-kicker">${esc(x.tag)}</p>` : ''}<h2>${esc(x.title)}</h2><p>${esc(x.text)}</p>`).join('\n')}
  </div>
  ${link ? `<aside class="s-cta s-cta--inline"><p class="s-cta__title">${esc(n.cta?.title || 'Capire batte commentare.')}</p><p>Approfondisci gratis con ${link.l ? `la lezione «${esc(link.l.title)}» del corso «${esc(link.c.title)}»` : `il corso «${esc(link.c.title)}»`}: cinque minuti, quiz e certificato.</p><a class="s-btn" href="${link.l ? lessonUrl(link.c, link.l) : courseUrl(link.c)}" data-cta="notizia-lezione">Apri la lezione</a></aside>` : ''}
  ${fonti.length ? `<section class="s-sources"><h2>Fonti</h2><ul>${fonti.map((u) => `<li><a href="${esc(u)}" rel="noopener">${esc(host(u))}</a></li>`).join('')}</ul></section>` : n.source ? `<p class="s-note">${esc(n.source)}</p>` : ''}
  <p class="s-note">Ogni mattina alle 8 THE LOBBY spiega il meccanismo dietro una notizia del giorno, con i fatti verificati su almeno due fonti e le regole su una fonte ufficiale. Nessun giudizio su partiti o persone: <a href="/neutralita/">la nostra linea</a>.</p>
</article>
${cta('Ogni giorno una notizia, spiegata', 'Segui THE LOBBY su Instagram o entra nell’app: lezioni da cinque minuti per capire le notizie, gratis.', 'notizia')}`;
    write(`notizie/${n.slug}/index.html`, page({
      path: newsUrl(n), stamp, type: 'article',
      title: `${n.title} · Dietro la notizia · THE LOBBY`,
      description: clip(`${n.subtitle || ''} ${n.slides[1]?.text || n.slides[0].text}`, 158),
      crumbs: [{ name: 'Notizie spiegate', path: '/notizie/' }, { name: n.title, path: newsUrl(n) }],
      jsonld: [{
        '@type': 'Article', headline: clip(n.title, 110), description: clip(n.subtitle || n.slides[0].text, 300), datePublished: n.date, dateModified: n.date,
        inLanguage: 'it', url: SITE + newsUrl(n), image: `${SITE}/img/og.png`, author: { '@id': `${SITE}/#org` }, publisher: { ...ORG },
        ...(fonti.length ? { citation: fonti } : {}),
      }],
      body: nbody,
    }));
    urls.push([newsUrl(n), n.date, '0.7']);
  }
  const body = `
<section class="s-hero">
  <span class="s-kicker">Dietro la notizia · ogni mattina alle 8</span>
  <h1>Le notizie spiegate: cosa c'è dietro</h1>
  <p class="s-lede">Tutti ne parlano, pochi sanno come funziona. Ogni giorno prendiamo una notizia e spieghiamo il meccanismo che c'è dietro: chi decide, con quali regole, in quali tempi. Fatti verificati, nessun tifo.</p>
  <a class="s-btn s-btn--ghost" href="${INSTAGRAM}" rel="noopener">Seguici su Instagram</a>
</section>
${news.length ? `<ul class="s-courses">${news.map((n) => `<li class="s-course"><a href="${newsUrl(n)}"><span class="s-course__tags"><em>${esc(itDate(n.date))}</em></span><strong>${esc(n.title)}</strong>${n.subtitle ? `<span>${esc(n.subtitle)}</span>` : ''}</a></li>`).join('')}</ul>` : '<p class="s-text">La prima notizia spiegata arriva domattina alle 8.</p>'}
${cta('Capire batte commentare', 'Lezioni da cinque minuti su Comune, Stato ed Europa, con quiz e certificato. Gratis.', 'notizie')}`;
  write('notizie/index.html', page({
    path: '/notizie/', stamp,
    title: 'Dietro la notizia: le notizie spiegate ogni giorno · THE LOBBY',
    description: 'Ogni mattina una notizia del giorno spiegata in modo semplice: il meccanismo che c’è dietro, chi decide e con quali regole. Fatti verificati, nessun tifo. Gratis.',
    crumbs: [{ name: 'Notizie spiegate', path: '/notizie/' }],
    jsonld: [{ '@type': 'ItemList', name: 'Dietro la notizia', itemListElement: news.map((n, i) => ({ '@type': 'ListItem', position: i + 1, name: n.title, url: SITE + newsUrl(n) })) }],
    body,
  }));
  urls.push(['/notizie/', news[0]?.date || today, '0.8']);
}

// ----- /docenti/ : free lessons for civic education (Legge 92/2019, Linee guida DM 183/2024)
{
  const groups = [
    { title: 'Costituzione, istituzioni e legalità', note: 'Comune, Parlamento, governo, Unione europea, come nasce una legge, come si vota.',
      slugs: ['chi-decide-cosa', 'come-nasce-una-legge', 'comune-senza-segreti', 'europa-in-20-minuti', 'storia-politica-italia', 'tuel-regole-del-gioco', 'farsi-sentire', 'rappresentante-di-lista', 'nuova-legge-elettorale', 'entrare-nelle-istituzioni', 'europa-futuro', 'migrazioni-regole-numeri'] },
    { title: 'Sviluppo economico, finanza e sostenibilità', note: 'I conti dello Stato, il fisco, il lavoro, il welfare, il clima e l’energia.',
      slugs: ['conti-dello-stato', 'italia-in-numeri', 'fisco-senza-paura', 'lavoro-che-cambia', 'welfare-politiche-sociali', 'clima-ambiente-regole', 'comunita-energetiche', 'casa-citta-giovani', 'sanita-territorio'] },
    { title: 'Cittadinanza digitale', note: 'Le regole dell’intelligenza artificiale e la partecipazione online.',
      slugs: ['intelligenza-artificiale-regole', 'digitale-democrazia'] },
    { title: 'Orientamento e competenze', note: 'Opportunità europee per i giovani e le basi per parlare in pubblico.',
      slugs: ['mappa-opportunita', 'bandi-europei', 'public-speaking-basi'] },
  ].map((g) => ({ ...g, items: g.slugs.map((s) => bySlug.get(s)).filter((c) => c && c.access === 'free' && c.lessons.length) })).filter((g) => g.items.length);
  const n = groups.reduce((t, g) => t + g.items.length, 0);
  const lessons = groups.reduce((t, g) => t + g.items.reduce((u, c) => u + c.lessons.length, 0), 0);
  const body = `
<section class="s-hero">
  <span class="s-kicker">Per i docenti · educazione civica</span>
  <h1>Lezioni pronte per l'educazione civica, gratis</h1>
  <p class="s-lede">${n} corsi e ${lessons} lezioni da cinque minuti su Costituzione, istituzioni, Unione europea, economia e cittadinanza digitale, con quiz, simulazioni e certificato finale. Gratuiti, senza pubblicità, indipendenti da qualsiasi partito.</p>
  <a class="s-btn" href="#corsi">Guarda le lezioni per tema</a>
</section>
<section class="s-box">
  <h2>Come usarle in classe</h2>
  <ol class="s-goals">
    <li><strong>Proietta la lezione</strong>: cinque minuti di testo chiaro, con le fonti ufficiali in fondo. Ogni lezione ha domande di verifica a metà.</li>
    <li><strong>Fate il quiz insieme</strong>, in classe o a casa: ogni corso si chiude con una simulazione in cui gli studenti prendono decisioni da amministratori.</li>
    <li><strong>Il certificato</strong>: chi finisce il corso lo riceve nell'app e può aggiungerlo al profilo LinkedIn. L'account è gratuito dai 14 anni; per le classi più giovani proietta le lezioni dal tuo account.</li>
  </ol>
  <p>Le ore di educazione civica sono almeno 33 l'anno (legge 92/2019) e le Linee guida del 2024 mettono al centro Costituzione, istituzioni, Unione europea, sviluppo economico e cittadinanza digitale: i temi qui sotto seguono quella divisione.</p>
</section>
<div id="corsi"></div>
${groups.map((g) => `<section class="s-group"><h2>${esc(g.title)}</h2><p class="s-text">${esc(g.note)}</p><ul class="s-courses">${g.items.map((c) => courseCard(c)).join('')}</ul></section>`).join('\n')}
<section class="s-box">
  <h2>Per parlare di attualità</h2>
  <p>Ogni mattina spieghiamo il meccanismo dietro una notizia del giorno, con i fatti verificati e nessun giudizio su partiti o persone: <a href="/notizie/">le notizie spiegate</a>. I corsi di attualità si aggiornano il 1° di ogni mese con le nuove leggi.</p>
</section>
<section class="s-box">
  <h2>Ti manca qualcosa?</h2>
  <p>Scrivici a <a href="mailto:thelobbysupport@gmail.com">thelobbysupport@gmail.com</a>: dicci il tema o la classe e proviamo a prepararlo. Se trovi un errore in una lezione, segnalalo direttamente dalla lezione: lo verifichiamo e lo correggiamo. <a href="/neutralita/">La nostra linea sulla neutralità</a>.</p>
</section>
${cta('Crea il tuo account docente, è gratis', 'Con l’account vedi le lezioni complete, i quiz e le simulazioni, e puoi proiettarli in classe.', 'docenti')}`;
  write('docenti/index.html', page({
    path: '/docenti/', stamp,
    title: 'Educazione civica: lezioni pronte e gratuite per docenti · THE LOBBY',
    description: `${lessons} lezioni da cinque minuti per l’educazione civica: Costituzione, istituzioni, Unione europea, economia e cittadinanza digitale, con quiz e certificato. Gratis e senza partiti.`,
    crumbs: [{ name: 'Per i docenti', path: '/docenti/' }],
    jsonld: [{ '@type': 'ItemList', name: 'Lezioni di educazione civica per tema', itemListElement: groups.flatMap((g) => g.items).map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + courseUrl(c), name: c.title })) }],
    body,
  }));
  urls.push(['/docenti/', today, '0.8']);
}

// ----- /andrea/
{
  const body = `
<section class="s-hero s-hero--founder">
  <img src="/img/andrea-cut.webp" alt="Andrea Bonazzi" width="220" height="280" loading="eager">
  <span class="s-kicker">Founder e docente di THE LOBBY</span>
  <h1>Andrea Bonazzi</h1>
  <p class="s-lede">Dieci anni dentro le istituzioni. Ora apre le porte a tutti.</p>
</section>
<div class="s-text">
  <p>Andrea è nato e cresciuto a Rozzano, alle porte di Milano. Ha cominciato a occuparsi di vita pubblica ai tempi della scuola e non ha più smesso: dieci anni di impegno civico, due mandati da consigliere comunale e, a 23 anni, la candidatura a sindaco della sua città.</p>
  <p>Nel 2022 è stato scelto come ambasciatore della Lombardia per l'Anno europeo dei giovani: conferenze ed eventi sul futuro dell'Unione, il confronto diretto con funzionari ed esperti delle istituzioni europee e la scoperta di quante opportunità esistono per i giovani, spesso senza che nessuno lo sappia.</p>
  <p>Di professione è formatore in un grande gruppo bancario internazionale: aiutare le persone a crescere è il suo mestiere. THE LOBBY mette insieme le due cose: un'academy gratuita per capire come funzionano davvero Comune, Stato ed Europa, e per cogliere le opportunità che offrono.</p>
</div>
<section class="s-box">
  <h2>Cosa porta nei corsi</h2>
  <ul class="s-goals">
    <li><strong>La macchina comunale</strong>: bilancio, mozioni, commissioni e servizi, visti dai banchi del consiglio.</li>
    <li><strong>La macchina nazionale</strong>: come lavorano Parlamento e governo e come le decisioni arrivano sui territori.</li>
    <li><strong>La macchina europea</strong>: programmi, fondi e opportunità dell'Unione, conosciuti da ambasciatore.</li>
  </ul>
</section>
<p class="s-note">THE LOBBY è un progetto indipendente: non è legato ad alcun partito ed è aperto a tutti, qualunque sia la tua idea politica. <a href="/neutralita/">Leggi la nostra linea</a>.</p>
<section class="s-box">
  <h2>Ne hanno parlato</h2>
  <p><a href="https://www.ilgiorno.it/milano/cronaca/andrea-bonazzi-ambasciatore-lombardia-5d472e39" rel="noopener">Il Giorno, 26 marzo 2022: «A 21 anni ambasciatore della Lombardia per l'Anno europeo dei giovani»</a></p>
</section>
${cta('Entra nelle sue lezioni', 'Il percorso dell’Academy è gratis: lezioni da cinque minuti, quiz e simulazioni, e ogni lunedì le opportunità della settimana.', 'andrea')}`;
  write('andrea/index.html', page({
    path: '/andrea/', stamp, type: 'profile',
    title: 'Andrea Bonazzi, founder di THE LOBBY',
    description: 'Andrea Bonazzi, founder e docente di THE LOBBY: dieci anni di impegno civico, due mandati da consigliere comunale, ambasciatore della Lombardia per l’Anno europeo dei giovani 2022.',
    crumbs: [{ name: 'Chi è Andrea?', path: '/andrea/' }],
    jsonld: [{ '@type': 'Person', '@id': `${SITE}/andrea/#person`, name: 'Andrea Bonazzi', url: `${SITE}/andrea/`, image: `${SITE}/img/andrea-cut.webp`, jobTitle: 'Founder e docente di THE LOBBY', worksFor: { '@id': `${SITE}/#org` }, homeLocation: { '@type': 'Place', name: 'Milano' } }, { ...ORG }],
    body,
  }));
  urls.push(['/andrea/', today, '0.6']);
}

// ----- /neutralita/
{
  const items = [
    ['Nessun partito', 'THE LOBBY non è affiliata ad alcun partito, movimento, candidato o comitato elettorale, non riceve soldi da loro e non fa propaganda. Non ospitiamo pubblicità politica e non pubblichiamo opportunità offerte da partiti.'],
    ['Spieghiamo i meccanismi, non le opinioni', 'Le lezioni raccontano chi decide cosa, con quali strumenti e con quali soldi. Non diamo giudizi su partiti, leader o schieramenti di oggi e non diciamo a nessuno come votare. La storia dei partiti la trattiamo come storia: fatti, date, fonti.'],
    ['Il founder', 'Andrea Bonazzi ha un impegno civico e un’esperienza amministrativa locale, che racconta nella sua pagina. Proprio per questo le sue idee personali restano fuori da THE LOBBY: nei corsi porta l’esperienza di chi le istituzioni le ha viste da dentro, non le sue posizioni.'],
    ['I tuoi dati non fanno politica', 'I dati di chi usa THE LOBBY non vengono mai usati per attività politiche, elettorali o di propaganda, non vengono comunicati a partiti, movimenti, candidati o comitati e non vengono usati per l’impegno politico personale di chi gestisce il progetto.'],
    ['Fonti e correzioni', 'Ogni lezione indica la data dell’ultimo aggiornamento e, man mano che le ricontrolliamo, le fonti ufficiali su cui si basa. Ogni mese rileggiamo i contenuti per tenere aggiornati numeri e norme. Se trovi un errore, segnalalo dalla lezione: lo verifichiamo e, se serve, lo correggiamo.'],
    ['Ospiti da aree diverse', 'Quando invitiamo persone delle istituzioni o della politica, a una lezione o a una cena, cerchiamo voci di aree diverse e lo diciamo chiaramente. Gli ospiti parlano a titolo personale e la loro presenza non è un sostegno di THE LOBBY.'],
    ['Social e comunicazione', 'Sui social valgono le stesse regole: pillole su come funzionano le istituzioni e opportunità di enti pubblici, mai prese di posizione su partiti o candidati.'],
    ['Se pensi che non stiamo rispettando questa linea', 'Scrivici a thelobbysupport@gmail.com indicando la lezione, il post o la pagina. Rispondiamo a tutti e, se hai ragione, correggiamo e lo diciamo.'],
  ];
  const body = `
<section class="s-hero">
  <span class="s-kicker">La nostra linea</span>
  <h1>Neutralità: spieghiamo le regole, non per chi votare</h1>
  <p class="s-lede">Gli impegni che prendiamo, nero su bianco.</p>
</section>
<ol class="s-charter">${items.map(([h, t]) => `<li><h2>${esc(h)}</h2><p>${esc(t)}</p></li>`).join('')}</ol>`;
  write('neutralita/index.html', page({
    path: '/neutralita/', stamp,
    title: 'La nostra linea: neutralità · THE LOBBY',
    description: 'THE LOBBY non è affiliata ad alcun partito: spiega come funzionano le istituzioni, non per chi votare. Fonti, correzioni e dati che non fanno politica.',
    crumbs: [{ name: 'Neutralità', path: '/neutralita/' }],
    body,
  }));
  urls.push(['/neutralita/', today, '0.4']);
}

// ----- sitemap, robots, IndexNow key
urls.unshift(['/', today, '1.0']);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([p, d, pr]) => `  <url><loc>${SITE}${p}</loc><lastmod>${d}</lastmod><priority>${pr}</priority></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`);
write(`${INDEXNOW_KEY}.txt`, INDEXNOW_KEY);
write('site-urls.txt', urls.map(([p]) => SITE + p).join('\n') + '\n');
console.log(`Built ${urls.length} public pages into ${OUT}`);
