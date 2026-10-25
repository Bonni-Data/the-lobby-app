// THE LOBBY · daily post on the Telegram channel (a free channel that reaches people outside Andrea's own contacts).
//
//   node scripts/telegram.mjs [--posts <the-lobby-posts checkout>] [--dry]
//
// Every morning, after the public pages are rebuilt, it posts:
//   1. the cover of today's «Dietro la notizia» (Andrea's face, as on Instagram) with a short caption and the link to the page;
//   2. the opportunities that entered the app in the last 24 hours, each with deadline and link to its page.
// Reads only public data (public.public_site, the posts repository). Needs the repository secrets TELEGRAM_BOT_TOKEN and
// TELEGRAM_CHAT_ID (e.g. @thelobbyitalia): without them it prints what it would send and exits quietly.
// Pure Node, no dependencies.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { oppSlug, newsSlug } from './shared.mjs';

const SITE = 'https://thelobbyitalia.it';
const SUPABASE_URL = 'https://unyqeshkfkvijehnlnex.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueXFlc2hrZmt2aWplaG5sbmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NDk4MjUsImV4cCI6MjEwNzMyNTgyNX0.eOZvjG6R0B_35bk1KBYFtVu3IqUiT3EBLmBYqGtJnPU';
const RAW = 'https://raw.githubusercontent.com/Bonni-Data/the-lobby-posts';
const PROMISES = 'Formazione per giovani politici, le migliori opportunità internazionali e networking con altri giovani di talento. Gratis.';
const UTM = 'utm_source=telegram&utm_medium=canale';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const POSTS = opt('--posts');
const DRY = args.includes('--dry');
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT = process.env.TELEGRAM_CHAT_ID || '';

const esc = (v) => String(v ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const withUtm = (path, campaign) => `${SITE}${path}${path.includes('?') ? '&' : '?'}${UTM}&utm_campaign=${campaign}`;
const romeDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(d);
const itDate = (ymd) => {
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

async function publicSite() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_site`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) throw new Error(`public_site ${res.status}: ${await res.text()}`);
  return res.json();
}

async function exists(url) {
  try { return (await fetch(url, { method: 'HEAD', redirect: 'follow' })).ok; } catch { return false; }
}

async function tg(method, body) {
  if (DRY || !TOKEN || !CHAT) {
    console.log(`\n--- ${method} (non inviato${DRY ? ': prova' : ': mancano TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID'}) ---\n${body.photo ? `[foto] ${body.photo}\n` : ''}${body.caption || body.text}`);
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT, parse_mode: 'HTML', ...body }),
  });
  const out = await res.json().catch(() => ({}));
  if (!out.ok) throw new Error(`Telegram ${method}: ${res.status} ${out.description || ''}`);
}

const data = await publicSite();
const today = romeDate();
const opps = data.opportunities || [];

// 1. «Dietro la notizia» of today
let news = null;
if (POSTS && existsSync(join(POSTS, 'data', `notizia-${today}.json`))) {
  try {
    const n = JSON.parse(readFileSync(join(POSTS, 'data', `notizia-${today}.json`), 'utf8'));
    if (n.title) news = n;
  } catch { /* malformed: skip the news part */ }
}
if (news) {
  const path = `/notizie/${newsSlug(today, news.title)}/`;
  const link = (await exists(`${SITE}${path}`)) ? withUtm(path, 'notizia') : withUtm('/notizie/', 'notizia');
  const cover = `${RAW}/main/posts/notizie/${today}/01.png`;
  const caption = [
    `<b>Dietro la notizia · ${esc(itDate(today))}</b>`,
    '',
    `<b>${esc(news.title)}</b>`,
    news.subtitle ? esc(news.subtitle) : '',
    '',
    `Cosa è successo e come funziona davvero, con le fonti: ${link}`,
    '',
    `<i>${esc(PROMISES)}</i>`,
  ].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n').slice(0, 1024);
  if (await exists(cover)) await tg('sendPhoto', { photo: cover, caption });
  else await tg('sendMessage', { text: caption, link_preview_options: { url: link, prefer_large_media: true } });
} else {
  console.log(`Nessun «Dietro la notizia» per ${today}.`);
}

// 2. Opportunities that entered the app in the last 24 hours
const since = Date.now() - 24 * 3600 * 1000;
const fresh = opps
  .filter((o) => o.created_at && Date.parse(o.created_at) >= since)
  .sort((a, b) => String(a.deadline || '9999').localeCompare(String(b.deadline || '9999')));
if (fresh.length) {
  const lines = fresh.slice(0, 12).map((o) => {
    const when = o.opens_on && o.opens_on > today ? `apre il ${itDate(o.opens_on)}` : o.deadline ? `scade il ${itDate(o.deadline)}` : 'candidature sempre aperte';
    return `• <a href="${withUtm(`/opportunita/${oppSlug(o)}/`, 'opportunita')}">${esc(o.title)}</a>${o.organization ? ` · ${esc(o.organization)}` : ''} · ${esc(when)}`;
  });
  const text = [
    `<b>${fresh.length === 1 ? 'Nuova opportunità' : `${fresh.length} nuove opportunità`} verificate oggi</b>`,
    '',
    ...lines,
    ...(fresh.length > 12 ? ['', `…e altre ${fresh.length - 12}.`] : []),
    '',
    `Tutte le ${opps.length} opportunità aperte, con requisiti e link al bando ufficiale: ${withUtm('/opportunita/', 'opportunita')}`,
    'THE LOBBY non organizza né finanzia queste opportunità: ci si candida sempre sul sito dell’ente.',
  ].join('\n');
  await tg('sendMessage', { text: text.slice(0, 4096), link_preview_options: { is_disabled: true } });
} else {
  console.log('Nessuna opportunità nuova nelle ultime 24 ore.');
}

// One line in the run summary (readable without opening the logs).
if (process.env.GITHUB_ACTIONS) {
  const sent = !DRY && TOKEN && CHAT ? 'pubblicato' : DRY ? 'prova, non pubblicato' : 'non pubblicato: mancano i segreti';
  console.log(`::notice title=Canale Telegram::${today} · notizia: ${news ? 'sì' : 'no'} · opportunità nuove: ${fresh.length} su ${opps.length} · ${sent}`);
}
