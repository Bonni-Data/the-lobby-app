// THE LOBBY · account: self-service GDPR rights for the signed-in member.
//   export  {}                    a copy of the member's data (art. 15 and 20 GDPR)
//   delete  { confirm: 'ELIMINA' } deletes the account and everything linked to it (art. 17 GDPR)
import { createClient } from 'jsr:@supabase/supabase-js@2';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const FIXED = ['https://thelobbyitalia.it', 'https://www.thelobbyitalia.it', 'https://bonni-data.github.io', 'http://localhost:4173', 'http://127.0.0.1:4173'];

async function allowed() {
  const { data } = await admin.from('mail_settings').select('app_url').eq('id', 1).maybeSingle();
  try { return data?.app_url ? [...FIXED, new URL(data.app_url).origin] : FIXED; } catch { return FIXED; }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const list = await allowed();
  const headers = {
    'Access-Control-Allow-Origin': origin && list.includes(origin) ? origin : list[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await admin.auth.getUser(jwt);
  const user = auth?.user;
  if (!user) return reply({ error: 'not_authenticated' }, 401);
  let body: any = {};
  try { body = await req.json(); } catch { return reply({ error: 'bad_request' }, 400); }

  if (body.action === 'export') {
    const uid = user.id;
    const [profile, progress, attempts, applications, rsvps, membership, xp] = await Promise.all([
      admin.from('profiles').select('display_name,email_verified_at,created_at').eq('id', uid).maybeSingle(),
      admin.from('lesson_progress').select('lesson_id,status,completed_at,updated_at').eq('user_id', uid),
      admin.from('quiz_attempts').select('quiz_id,score,max_score,created_at').eq('user_id', uid),
      admin.from('premium_applications').select('full_name,email,about,experience,goal,link,status,reviewer_note,created_at,reviewed_at').eq('user_id', uid),
      admin.from('event_rsvps').select('event_id,response,updated_at').eq('user_id', uid),
      admin.from('memberships').select('plan,status,created_at').eq('user_id', uid),
      admin.from('xp_events').select('id,kind,ref,xp,meta,created_at').eq('user_id', uid).order('created_at'),
    ]);
    return reply({
      generated_at: new Date().toISOString(),
      account: { id: uid, email: user.email, created_at: user.created_at, provider: user.app_metadata?.provider, metadata: user.user_metadata },
      profile: profile.data, lesson_progress: progress.data, quiz_attempts: attempts.data,
      premium_applications: applications.data, event_responses: rsvps.data, premium_membership: membership.data,
      points_badges_certificates: xp.data,
    });
  }

  if (body.action === 'delete') {
    if (body.confirm !== 'ELIMINA') return reply({ error: 'confirm_required' }, 400);
    const { count } = await admin.from('user_roles').select('user_id', { count: 'exact', head: true }).eq('user_id', user.id).eq('role', 'admin');
    if (count) return reply({ error: 'founder_account' }, 403);
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) { console.error(error); return reply({ error: 'delete_failed' }, 500); }
    return reply({ ok: true });
  }

  return reply({ error: 'unknown_action' }, 400);
});
