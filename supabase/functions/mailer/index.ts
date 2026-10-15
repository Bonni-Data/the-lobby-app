// THE LOBBY · mailer: sends the emails queued in public.email_outbox through Resend.
// Actions (no JWT: the function only ever sends rows the database queued, or a recovery link to an existing account):
//   send     { id }               one queued email (called by the database right after commit)
//   flush    {}                   everything still queued (pg_cron every 10 minutes, and after going live)
//   recover  { email, redirectTo } password reset link, rate limited, never says whether the account exists
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Resend key: function secret if set, otherwise the Vault (public.mail_key_get, service role only).
let resendKey = Deno.env.get('RESEND_API_KEY') || '';
async function key() {
  if (!resendKey) {
    const { data } = await db.rpc('mail_key_get');
    resendKey = typeof data === 'string' ? data : '';
  }
  return resendKey;
}

const ADMIN_KINDS = new Set(['test', 'live_pronta', 'candidatura']);
const FIXED_ORIGINS = ['https://bonni-data.github.io', 'http://localhost:4173', 'http://127.0.0.1:4173'];

type Settings = { from_email: string | null; from_name: string; reply_to: string; admin_email: string; app_url: string; live: boolean };
type Row = { id: string; kind: string; to_email: string; to_name: string | null; payload: Record<string, any>; attempts: number; status: string };

async function settings(): Promise<Settings> {
  const { data, error } = await db.from('mail_settings').select('*').eq('id', 1).single();
  if (error) throw error;
  return data as Settings;
}

function origins(s: Settings) {
  try { return [...FIXED_ORIGINS, new URL(s.app_url).origin]; } catch { return FIXED_ORIGINS; }
}

function cors(origin: string | null, s?: Settings): Record<string, string> {
  const allowed = s ? origins(s) : FIXED_ORIGINS;
  return {
    'Access-Control-Allow-Origin': origin && allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const first = (name?: string | null) => (name || '').trim().split(/\s+/)[0] || '';

function when(iso: string) {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' }).format(d);
  const time = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(d);
  return `${day} alle ${time}`;
}

function ics(p: Record<string, any>) {
  const start = new Date(p.starts_at);
  const end = new Date(start.getTime() + 90 * 60_000);
  const z = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const e = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`);
  const body = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//THE LOBBY//Live//IT', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${p.event_id}@thelobby`, `DTSTAMP:${z(new Date())}`, `DTSTART:${z(start)}`, `DTEND:${z(end)}`,
    `SUMMARY:${e(`THE LOBBY · ${p.course} (live con Andrea)`)}`,
    p.join_url ? `DESCRIPTION:${e(`Link Teams: ${p.join_url}`)}` : '',
    p.join_url ? `URL:${p.join_url}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  const bytes = new TextEncoder().encode(body);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return { filename: 'the-lobby-live.ics', content: btoa(bin), content_type: 'text/calendar' };
}

/* ---------- Layout ---------- */
type Block = { p?: string; quote?: string; button?: { label: string; url: string }; small?: string; facts?: [string, string][] };

function layout(title: string, blocks: Block[], s: Settings) {
  const body = blocks.map((b) => {
    if (b.p) return `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#111C35">${b.p}</p>`;
    if (b.quote) return `<p style="margin:0 0 18px;padding:12px 16px;border-left:3px solid #FF7058;background:#FBF9F5;font-style:italic;font-size:15px;line-height:1.5;color:#111C35">${b.quote}</p>`;
    if (b.small) return `<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#5B6275">${b.small}</p>`;
    if (b.facts) return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;width:100%;border-collapse:collapse">${b.facts.map(([k, v]) =>
      `<tr><td style="padding:8px 0;border-bottom:1px solid #E3DDD1;font-size:13px;color:#5B6275;vertical-align:top;width:34%">${k}</td><td style="padding:8px 0;border-bottom:1px solid #E3DDD1;font-size:15px;color:#111C35">${v}</td></tr>`).join('')}</table>`;
    if (b.button) return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 22px"><tr><td style="border-radius:999px;background:#FF7058">
      <a href="${esc(b.button.url)}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:700;color:#111C35;text-decoration:none;border-radius:999px">${esc(b.button.label)}</a></td></tr></table>`;
    return '';
  }).join('\n');
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#F4F0E8;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F0E8"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="background:#111C35;padding:22px 28px">
  <span style="display:inline-block;width:16px;height:20px;border:3px solid #FF7058;border-bottom:0;border-radius:999px 999px 0 0;vertical-align:-3px;margin-right:10px"></span>
  <span style="font-family:'Arial Narrow',Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;letter-spacing:3px;color:#F4F0E8">THE LOBBY</span>
</td></tr>
<tr><td style="padding:30px 28px 10px">
  <h1 style="margin:0 0 18px;font-family:'Arial Narrow',Helvetica,Arial,sans-serif;font-size:28px;line-height:1.1;color:#111C35">${esc(title)}</h1>
  ${body}
  <p style="margin:8px 0 26px;font-size:15px;color:#111C35">Andrea<br><span style="color:#5B6275;font-size:13px">Founder e docente di THE LOBBY</span></p>
</td></tr>
<tr><td style="padding:18px 28px;background:#FBF9F5;border-top:1px solid #E3DDD1;font-size:12px;line-height:1.5;color:#5B6275">
  Ricevi questa email perché hai un account su THE LOBBY. Domande? Rispondi a questa email o scrivi a ${esc(s.reply_to)}.<br>
  <a href="${esc(s.app_url)}" style="color:#E2553E">${esc(s.app_url.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>
</td></tr></table></td></tr></table></body></html>`;
}

function plain(title: string, blocks: Block[]) {
  const strip = (h: string) => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return [title, '', ...blocks.map((b) =>
    b.p ? strip(b.p) : b.quote ? `“${strip(b.quote)}”` : b.small ? strip(b.small)
      : b.facts ? b.facts.map(([k, v]) => `${k}: ${strip(v)}`).join('\n') : b.button ? `${b.button.label}: ${b.button.url}` : ''),
    '', 'Andrea, founder e docente di THE LOBBY'].join('\n\n');
}

/* ---------- Templates ---------- */
type Mail = { subject: string; title: string; blocks: Block[]; attachments?: { filename: string; content: string; content_type?: string }[] };

function render(r: Row, s: Settings): Mail {
  const p = r.payload || {};
  const app = s.app_url.endsWith('/') ? s.app_url : s.app_url + '/';
  const hi = first(r.to_name) ? `Ciao ${esc(first(r.to_name))},` : 'Ciao,';
  const course = esc(p.course);
  const courseUrl = `${app}#/corso/${p.slug}`;
  switch (r.kind) {
    case 'verifica':
      return {
        subject: 'Conferma la tua email per entrare nella Lobby',
        title: 'Benvenuto nella Lobby.',
        blocks: [
          { p: `${hi} manca un ultimo passo: conferma che questa email è tua.` },
          { p: 'Ci serve per mandarti le date delle lezioni live, i link per entrare e la risposta alla tua candidatura Premium.' },
          { button: { label: 'Conferma la mia email', url: `${app}#/verifica?t=${encodeURIComponent(p.token)}` } },
          { small: 'Il link vale 7 giorni. Se non ti sei iscritto tu, ignora questa email.' },
        ],
      };
    case 'live_prenotata': {
      const yes = Number(p.yes_count || 0), min = Number(p.min_seats || 15);
      return {
        subject: `Posto prenotato: ${p.course}`,
        title: 'Il tuo posto è prenotato.',
        blocks: [
          { p: `${hi} hai prenotato la lezione live <strong>«${course}»</strong> con Andrea, su Microsoft Teams.` },
          { p: yes >= min
            ? `Siete già ${yes}: si parte. Andrea sta fissando la data e ti scriviamo qui con giorno, ora e link per entrare.`
            : `Si parte a ${min} iscritti: per ora siete ${yes}. Appena ci arriviamo, Andrea fissa la data e ti scriviamo qui con giorno, ora e link per entrare.` },
          { small: 'Vuoi partire prima? Porta qualcuno con te: chi è in Premium può prenotare dalla pagina del corso.' },
          { button: { label: 'Vai al corso', url: courseUrl } },
        ],
      };
    }
    case 'live_pronta':
      return {
        subject: `${p.course}: ${p.yes_count} iscritti, si parte`,
        title: 'Una live è pronta a partire.',
        blocks: [
          { p: `La lezione live <strong>«${course}»</strong> ha raggiunto ${esc(p.yes_count)} iscritti su ${esc(p.min_seats)}.` },
          { p: 'Fissa data e link Teams dall’Area founder: gli iscritti ricevono subito l’email con tutti i dettagli.' },
          { button: { label: 'Apri la sezione Live', url: `${app}#/admin?sezione=live` } },
        ],
      };
    case 'live_data':
    case 'live_aggiornata':
    case 'live_domani': {
      const date = p.starts_at ? when(p.starts_at) : '';
      const title = r.kind === 'live_domani' ? 'Domani si va in diretta.' : r.kind === 'live_aggiornata' ? 'La live è stata aggiornata.' : 'Ci siamo: la live ha una data.';
      const subject = r.kind === 'live_domani' ? `Domani la live: ${p.course}` : r.kind === 'live_aggiornata' ? `${p.course}: data o link aggiornati` : `${p.course}: la live è ${date}`;
      const lead = r.kind === 'live_domani'
        ? `${hi} promemoria: domani c’è la lezione live <strong>«${course}»</strong> con Andrea.`
        : r.kind === 'live_aggiornata'
          ? `${hi} Andrea ha aggiornato la lezione live <strong>«${course}»</strong>. Ecco i dettagli giusti: usa questi.`
          : `${hi} la lezione live <strong>«${course}»</strong> con Andrea ha una data.`;
      return {
        subject,
        title,
        blocks: [
          { p: lead },
          { facts: [['Quando', esc(date)], ['Dove', 'Microsoft Teams, dal link qui sotto']] },
          ...(p.join_url ? [{ button: { label: 'Entra su Teams', url: p.join_url } } as Block] : []),
          { small: r.kind === 'live_domani'
            ? 'Entra cinque minuti prima e prova audio e video. Se non riesci più a esserci, annulla dalla pagina del corso: liberi il posto per qualcun altro.'
            : 'In allegato trovi il file per aggiungerla al calendario. Il giorno prima ti mandiamo un promemoria.' },
          { small: `Trovi data e link anche nella <a href="${esc(courseUrl)}" style="color:#E2553E">pagina del corso</a>.` },
        ],
        attachments: r.kind === 'live_domani' || !p.starts_at ? undefined : [ics(p)],
      };
    }
    case 'premium_ok':
      return {
        subject: 'Sei dentro: Premium attivato',
        title: 'La porta è aperta.',
        blocks: [
          { p: `${hi} ho letto la tua candidatura e ti apro la porta: da oggi sei in Premium.` },
          ...(p.note ? [{ quote: esc(p.note) } as Block] : []),
          { p: 'Dentro trovi i corsi avanzati, le lezioni live su Teams da prenotare, le cene della Lobby e tutte le opportunità, ogni mattina.' },
          { button: { label: 'Entra in Premium', url: `${app}#/premium` } },
        ],
      };
    case 'premium_no':
      return {
        subject: 'La tua candidatura Premium',
        title: 'Non ancora, ma ci sei vicino.',
        blocks: [
          { p: `${hi} grazie per esserti raccontato. Per ora non ti apro ancora la porta di Premium.` },
          ...(p.note ? [{ quote: esc(p.note) } as Block] : []),
          { p: 'Tra 30 giorni puoi ricandidarti, con qualche passo in più da raccontare. Intanto i corsi gratuiti e le prime opportunità sono lì per te.' },
          { button: { label: 'Continua con i corsi', url: `${app}#/academy` } },
        ],
      };
    case 'candidatura':
      return {
        subject: `Nuova candidatura Premium: ${p.name}`,
        title: 'Nuova candidatura Premium.',
        blocks: [
          { facts: [['Nome', esc(p.name)], ['Email', esc(p.email)], ['Chi è oggi', esc(p.about)], ['Cosa ha fatto', esc(p.experience)], ['Prossimo livello', esc(p.goal)], ['Link', esc(p.link || '-')]] },
          { button: { label: 'Valuta nell’Area founder', url: `${app}#/admin` } },
        ],
      };
    case 'password':
      return {
        subject: 'Reimposta la tua password',
        title: 'Scegli una nuova password.',
        blocks: [
          { p: `${hi} hai chiesto di reimpostare la password del tuo account THE LOBBY.` },
          { button: { label: 'Scegli una nuova password', url: p.link } },
          { small: 'Il link vale un’ora. Se non sei stato tu, ignora questa email: la password resta quella di prima.' },
        ],
      };
    case 'test':
      return {
        subject: 'Email di prova da THE LOBBY',
        title: 'Funziona.',
        blocks: [{ p: 'Questa è una prova: le email dell’app partono e arrivano.' }, { button: { label: 'Apri THE LOBBY', url: app } }],
      };
    default:
      throw new Error(`unknown kind ${r.kind}`);
  }
}

/* ---------- Sending ---------- */
async function deliver(r: Row, s: Settings) {
  const m = render(r, s);
  const from = s.from_email ? `${s.from_name} <${s.from_email}>` : `${s.from_name} <onboarding@resend.dev>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await key()}`, 'Content-Type': 'application/json', 'Idempotency-Key': r.id },
    body: JSON.stringify({
      from,
      to: [r.to_email],
      reply_to: s.reply_to,
      subject: m.subject,
      html: layout(m.title, m.blocks, s),
      text: plain(m.title, m.blocks),
      attachments: m.attachments,
      tags: [{ name: 'kind', value: r.kind }],
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`resend ${res.status}: ${body?.message || body?.name || 'error'}`);
  return body?.id as string;
}

async function processRow(id: string, s: Settings): Promise<string> {
  const { data: peek } = await db.from('email_outbox').select('id,kind,status,attempts').eq('id', id).maybeSingle();
  if (!peek || !['queued', 'error'].includes(peek.status) || peek.attempts >= 5) return 'skip';
  if (!(await key())) {
    await db.from('email_outbox').update({ error: 'in attesa: servizio email non ancora collegato' }).eq('id', id);
    return 'waiting';
  }
  if (!s.live && !ADMIN_KINDS.has(peek.kind) && peek.kind !== 'password') {
    await db.from('email_outbox').update({ error: 'in attesa: dominio email non ancora attivo' }).eq('id', id);
    return 'waiting';
  }
  const { data: claimed } = await db.from('email_outbox')
    .update({ status: 'sending', attempts: peek.attempts + 1 })
    .eq('id', id).in('status', ['queued', 'error']).eq('attempts', peek.attempts)
    .select('*').maybeSingle();
  if (!claimed) return 'skip';
  try {
    const providerId = await deliver(claimed as Row, s);
    const payload = claimed.kind === 'password' ? {} : claimed.payload;
    await db.from('email_outbox').update({ status: 'sent', provider_id: providerId, sent_at: new Date().toISOString(), error: null, payload }).eq('id', id);
    return 'sent';
  } catch (e) {
    await db.from('email_outbox').update({ status: 'error', error: String((e as Error).message || e).slice(0, 500) }).eq('id', id);
    return 'error';
  }
}

async function flush(s: Settings) {
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { data } = await db.from('email_outbox').select('id')
    .in('status', ['queued', 'error']).lt('attempts', 5).gt('created_at', since)
    .order('created_at', { ascending: true }).limit(40);
  const out: Record<string, number> = {};
  for (const row of data || []) {
    const r = await processRow(row.id, s);
    out[r] = (out[r] || 0) + 1;
    if (r === 'sent') await new Promise((ok) => setTimeout(ok, 600)); // stay under Resend's rate limit
  }
  return out;
}

async function recover(email: string, redirectTo: string, s: Settings) {
  const addr = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(addr)) return;
  const okRedirect = origins(s).some((o) => String(redirectTo || '').startsWith(o));
  const redirect = okRedirect ? redirectTo : s.app_url;
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from('email_outbox').select('id', { count: 'exact', head: true }).eq('kind', 'password').eq('to_email', addr).gt('created_at', since);
  if ((count || 0) >= 3) return;
  const { data, error } = await db.auth.admin.generateLink({ type: 'recovery', email: addr, options: { redirectTo: redirect } });
  if (error || !data?.properties?.action_link) return; // no account: same answer, nothing sent
  const { data: row } = await db.from('email_outbox').insert({
    kind: 'password', to_email: addr, to_name: data.user?.user_metadata?.full_name || null, user_id: data.user?.id || null,
    payload: { link: data.properties.action_link },
  }).select('id').single();
  if (row) await processRow(row.id, s);
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  let s: Settings;
  try { s = await settings(); } catch { return new Response(JSON.stringify({ error: 'unavailable' }), { status: 503, headers: { ...cors(origin), 'Content-Type': 'application/json' } }); }
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(origin, s), 'Content-Type': 'application/json' } });
  let body: any = {};
  try { body = await req.json(); } catch { return reply({ error: 'bad_request' }, 400); }
  try {
    if (body.action === 'send' && typeof body.id === 'string') return reply({ result: await processRow(body.id, s) });
    if (body.action === 'flush') return reply({ result: await flush(s) });
    if (body.action === 'recover') { await recover(body.email, body.redirectTo, s); return reply({ ok: true }); }
    return reply({ error: 'unknown_action' }, 400);
  } catch (e) {
    console.error(e);
    return reply({ error: 'server_error' }, 500);
  }
});
