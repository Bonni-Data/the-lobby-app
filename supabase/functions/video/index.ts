// Disabled on 2026-10-15: Premium courses are now text lessons or live sessions on Teams, no hosted video.
const ORIGINS = ['https://bonni-data.github.io', 'http://localhost:4173', 'http://127.0.0.1:4173'];
Deno.serve((req) => {
  const origin = req.headers.get('origin');
  const headers = {
    'Access-Control-Allow-Origin': origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  return new Response(JSON.stringify({ error: 'gone' }), { status: 410, headers });
});
