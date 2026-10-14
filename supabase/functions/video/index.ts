// THE LOBBY · video edge function (Bunny Stream).
// Actions:
//   play          any signed-in user: signed embed URL for a lesson they can see (RLS decides access)
//   status        founder: is Bunny connected?
//   connect       founder: one-time setup from the Bunny account API key (key is used once, never stored)
//   create-upload founder: creates the video on Bunny and returns a TUS upload signature
//   check         founder: reads encoding status from Bunny and updates the lesson
import { createClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = ['https://bonni-data.github.io', 'http://localhost:4173', 'http://127.0.0.1:4173'];
const REFERRERS = ['bonni-data.github.io'];
const LIBRARY_NAME = 'THE LOBBY';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const server = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function cors(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function reply(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json' } });
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

type Config = { library_id: string; api_key: string; token_key: string };

async function getConfig(): Promise<Config | null> {
  const { data, error } = await server.rpc('video_config_get');
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as Config | undefined;
  return row?.library_id && row?.api_key && row?.token_key ? row : null;
}

async function bunny(url: string, key: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { AccessKey: key, Accept: 'application/json', 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
}

async function connect(accountKey: string) {
  const list = await bunny('https://api.bunny.net/videolibrary?page=1&perPage=1000', accountKey);
  if (list.status === 401 || list.status === 403) return { error: 'bad_key' as const };
  if (!list.ok) throw new Error(`list libraries ${list.status}`);
  const items: any[] = Array.isArray(list.body) ? list.body : list.body?.Items || [];
  let lib = items.find((x) => x.Name === LIBRARY_NAME);
  if (!lib) {
    const created = await bunny('https://api.bunny.net/videolibrary', accountKey, {
      method: 'POST',
      body: JSON.stringify({ Name: LIBRARY_NAME }),
    });
    if (!created.ok) throw new Error(`create library ${created.status} ${JSON.stringify(created.body)}`);
    lib = created.body;
  }
  const id = lib.Id;
  // Signed embeds only: the player opens only with a token generated here.
  const secured = await bunny(`https://api.bunny.net/videolibrary/${id}`, accountKey, {
    method: 'POST',
    body: JSON.stringify({ PlayerTokenAuthenticationEnabled: true, BlockNoneReferrer: false }),
  });
  if (!secured.ok) throw new Error(`secure library ${secured.status} ${JSON.stringify(secured.body)}`);
  // Brand colour, best effort.
  await bunny(`https://api.bunny.net/videolibrary/${id}`, accountKey, {
    method: 'POST',
    body: JSON.stringify({ PlayerKeyColor: '#ff7058' }),
  });
  const full = await bunny(`https://api.bunny.net/videolibrary/${id}`, accountKey);
  if (!full.ok) throw new Error(`read library ${full.status}`);
  const allowed: string[] = full.body?.AllowedReferrers || [];
  for (const host of REFERRERS) {
    if (!allowed.includes(host)) {
      const r = await bunny(`https://api.bunny.net/videolibrary/${id}/addAllowedReferrer`, accountKey, {
        method: 'POST',
        body: JSON.stringify({ Hostname: host }),
      });
      if (!r.ok) throw new Error(`referrer ${r.status} ${JSON.stringify(r.body)}`);
    }
  }
  const zone = await bunny(`https://api.bunny.net/pullzone/${full.body.PullZoneId}`, accountKey);
  if (!zone.ok) throw new Error(`pull zone ${zone.status}`);
  const apiKey = full.body?.ApiKey;
  const tokenKey = zone.body?.ZoneSecurityKey;
  if (!apiKey || !tokenKey) throw new Error('missing library keys');
  const { error } = await server.rpc('video_config_set', { p_library_id: String(id), p_api_key: apiKey, p_token_key: tokenKey });
  if (error) throw error;
  return { connected: true, libraryId: String(id) };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return reply({ error: 'method' }, 405, origin);

  const auth = req.headers.get('Authorization') || '';
  const jwt = auth.replace(/^Bearer\s+/i, '');
  const user = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data: who } = await user.auth.getUser(jwt);
  if (!who?.user) return reply({ error: 'auth' }, 401, origin);

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body */ }
  const action = String(body.action || '');
  const lessonId = String(body.lessonId || '');

  try {
    if (action === 'play') {
      // RLS on lessons decides: free lesson, Premium member, or founder.
      const { data: rows, error } = await user.from('lessons').select('id, video_ref').eq('id', lessonId).limit(1);
      if (error) throw error;
      const lesson = rows?.[0];
      if (!lesson) return reply({ error: 'forbidden' }, 403, origin);
      if (!lesson.video_ref?.startsWith('bunny:')) return reply({ error: 'no_video' }, 404, origin);
      const cfg = await getConfig();
      if (!cfg) return reply({ error: 'not_configured' }, 503, origin);
      const videoId = lesson.video_ref.slice(6);
      const expires = Math.floor(Date.now() / 1000) + 4 * 3600;
      const token = await sha256Hex(cfg.token_key + videoId + expires);
      const url = `https://player.mediadelivery.net/embed/${cfg.library_id}/${videoId}?token=${token}&expires=${expires}&autoplay=false&preload=true&responsive=true`;
      return reply({ url, expires }, 200, origin);
    }

    const { data: isAdmin } = await user.rpc('is_admin');
    if (!isAdmin) return reply({ error: 'forbidden' }, 403, origin);

    if (action === 'status') {
      const cfg = await getConfig();
      return reply({ connected: !!cfg, libraryId: cfg?.library_id ?? null }, 200, origin);
    }

    if (action === 'connect') {
      const key = String(body.accountKey || '').trim();
      if (key.length < 20) return reply({ error: 'bad_key' }, 400, origin);
      const out = await connect(key);
      return reply(out, 'error' in out ? 400 : 200, origin);
    }

    const cfg = await getConfig();
    if (!cfg) return reply({ error: 'not_configured' }, 503, origin);
    const { data: lesson, error: lerr } = await server.from('lessons').select('id, title, video_ref').eq('id', lessonId).maybeSingle();
    if (lerr) throw lerr;
    if (!lesson) return reply({ error: 'lesson_not_found' }, 404, origin);

    if (action === 'create-upload') {
      const created = await bunny(`https://video.bunnycdn.com/library/${cfg.library_id}/videos`, cfg.api_key, {
        method: 'POST',
        body: JSON.stringify({ title: lesson.title }),
      });
      if (!created.ok || !created.body?.guid) throw new Error(`create video ${created.status} ${JSON.stringify(created.body)}`);
      const videoId = created.body.guid as string;
      const expires = Math.floor(Date.now() / 1000) + 6 * 3600;
      const signature = await sha256Hex(cfg.library_id + cfg.api_key + expires + videoId);
      const { error } = await server.from('lessons').update({ video_ref: `bunny:${videoId}`, video_status: 'uploading' }).eq('id', lesson.id);
      if (error) throw error;
      return reply({ videoId, libraryId: cfg.library_id, expires, signature }, 200, origin);
    }

    if (action === 'check') {
      if (!lesson.video_ref?.startsWith('bunny:')) return reply({ status: 'none' }, 200, origin);
      const videoId = lesson.video_ref.slice(6);
      const v = await bunny(`https://video.bunnycdn.com/library/${cfg.library_id}/videos/${videoId}`, cfg.api_key);
      let status: 'uploading' | 'processing' | 'ready' | 'error' = 'processing';
      if (v.status === 404) status = 'error';
      else if (!v.ok) throw new Error(`get video ${v.status}`);
      else if (v.body.status === 4) status = 'ready';
      else if (v.body.status === 5 || v.body.status === 6) status = 'error';
      else if (v.body.status === 0) status = 'uploading';
      const patch: Record<string, unknown> = { video_status: status };
      if (v.ok && v.body.length > 0) patch.duration_seconds = v.body.length;
      const { error } = await server.from('lessons').update(patch).eq('id', lesson.id);
      if (error) throw error;
      return reply({ status, progress: v.body?.encodeProgress ?? 0, length: v.body?.length ?? 0 }, 200, origin);
    }

    return reply({ error: 'action' }, 400, origin);
  } catch (e) {
    console.error('video function error', action, e instanceof Error ? e.message : e);
    return reply({ error: 'server' }, 500, origin);
  }
});
