import { rpc, select, currentSession } from './api';

/* ---------- Data shapes ---------- */

export type Check =
  | { type: 'choice'; after?: string; prompt: string; options: string[]; correct: number; why?: string }
  | { type: 'truefalse'; after?: string; statement: string; answer: boolean; why?: string }
  | { type: 'order'; after?: string; prompt: string; items: string[]; why?: string };

export type SimChoice = { label: string; score: number; feedback: string; next?: string | null };
export type SimNode = { text: string; choices: SimChoice[] };
export type SimEnding = { min: number; title: string; text: string };
export type Scenario = { title: string; role: string; intro: string; start: string; nodes: Record<string, SimNode>; endings: SimEnding[] };

export type Badge = { id: string; at: string | null };
export type Stats = {
  xp: number;
  streak: number;
  best_streak: number;
  active_today: boolean;
  lessons: number;
  checks: number;
  perfect_quizzes: number;
  badges: Badge[];
  courses: { course_id: string; cert_id: string; completed_at: string }[];
  sims: { course_id: string; score: number; max: number; ending: string | null; xp: number }[];
};

export type Certificate = {
  id: string;
  name: string;
  course: string;
  slug: string;
  category: string | null;
  level: string;
  premium: boolean;
  completed_at: string;
  lessons: number;
  minutes: number;
  mine: boolean;
};

/* ---------- Levels: from citizen to European commissioner ---------- */

export const LEVELS = [
  { name: 'Cittadino', xp: 0, line: 'Hai varcato la porta. Da qui si sale.' },
  { name: 'Attivista', xp: 150, line: 'Hai iniziato a muoverti: le regole del gioco non sono più un mistero.' },
  { name: 'Consigliere comunale', xp: 500, line: 'Sai come si prende una decisione nella tua città.' },
  { name: 'Assessore', xp: 1000, line: 'Hai le deleghe: adesso si tratta di farle funzionare.' },
  { name: 'Sindaco', xp: 1700, line: 'La fascia tricolore è tua. La città ti guarda.' },
  { name: 'Consigliere regionale', xp: 2600, line: 'Sali di livello istituzionale: sanità, trasporti, fondi europei.' },
  { name: 'Deputato', xp: 3800, line: 'Montecitorio ti aspetta: leggi, commissioni, emendamenti.' },
  { name: 'Ministro', xp: 5300, line: 'Un ministero sulle spalle. Ogni scelta pesa.' },
  { name: 'Commissario europeo', xp: 7500, line: 'Il gradino più alto della Lobby. Hai fatto tutta la strada.' },
];

export function levelFor(xp: number) {
  let i = 0;
  while (i < LEVELS.length - 1 && xp >= LEVELS[i + 1].xp) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  const progress = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { index: i, number: i + 1, name: cur.name, line: cur.line, next, toNext: next ? next.xp - xp : 0, progress };
}

/* ---------- Badges ---------- */

export const BADGES: { id: string; name: string; text: string; icon: string }[] = [
  { id: 'primo-passo', name: 'Primo passo', text: 'Completa la tua prima lezione.', icon: 'door' },
  { id: 'dieci-lezioni', name: 'Dieci porte aperte', text: 'Completa 10 lezioni.', icon: 'book' },
  { id: 'primo-corso', name: 'Primo corso', text: 'Completa tutte le lezioni di un corso.', icon: 'award' },
  { id: 'tre-corsi', name: 'Tre su tre', text: 'Completa 3 corsi.', icon: 'medal' },
  { id: 'tutto-giusto', name: 'Tutto giusto', text: 'Fai un quiz senza errori.', icon: 'target' },
  { id: 'cecchino', name: 'Cecchino', text: '10 quiz senza errori.', icon: 'crosshair' },
  { id: 'occhio-attento', name: 'Occhio attento', text: '25 risposte giuste dentro le lezioni.', icon: 'eye' },
  { id: 'serie-3', name: 'Tre giorni di fila', text: 'Impara qualcosa 3 giorni consecutivi.', icon: 'flame' },
  { id: 'serie-7', name: 'Una settimana intera', text: 'Impara qualcosa 7 giorni consecutivi.', icon: 'flame' },
  { id: 'serie-30', name: 'Un mese senza pause', text: 'Impara qualcosa 30 giorni consecutivi.', icon: 'flame' },
  { id: 'prima-simulazione', name: 'In campo', text: 'Porta a termine una simulazione finale.', icon: 'swords' },
  { id: 'stratega', name: 'Stratega', text: 'Chiudi 3 simulazioni con almeno l’80%.', icon: 'chess' },
  { id: 'area-comune', name: 'Esperto di Comune', text: 'Completa tutti i corsi gratuiti dell’area Comune.', icon: 'landmark' },
  { id: 'area-italia', name: 'Esperto di Italia', text: 'Completa tutti i corsi gratuiti dell’area Italia.', icon: 'landmark' },
  { id: 'area-europa', name: 'Esperto di Europa', text: 'Completa tutti i corsi gratuiti dell’area Europa.', icon: 'globe' },
  { id: 'area-skill', name: 'Skill sbloccate', text: 'Completa tutti i corsi gratuiti dell’area Skill personali.', icon: 'mic' },
  { id: 'sala-riservata', name: 'Sala riservata', text: 'Completa un corso Premium.', icon: 'key' },
  { id: 'prima-tappa', name: 'Prima tappa', text: 'Completa una tappa del percorso.', icon: 'route' },
  { id: 'percorso-completo', name: 'Da cittadino a protagonista', text: 'Completa tutte le tappe del percorso.', icon: 'flag' },
  { id: 'ambasciatore', name: 'Ambasciatore', text: 'Porta nella Lobby 3 amici con il tuo link.', icon: 'users' },
];

export const XP = { lesson: 50, check: 10, quizPerAnswer: 10, quizPerfect: 20, course: 200, sim: 100 };

/* ---------- API ---------- */

export async function myStats(): Promise<Stats | null> {
  if (!currentSession()) return null;
  return rpc<Stats>('my_stats', {});
}

export function checkAnswer(lessonId: string, index: number, answer: number | boolean | number[]) {
  return rpc<{ correct: boolean; xp: number }>('check_answer', { p_lesson: lessonId, p_index: index, p_answer: answer });
}

export async function getSimulation(courseId: string): Promise<Scenario | null> {
  const rows = await select<{ scenario: Scenario }>('course_simulations', `select=scenario&course_id=eq.${courseId}&limit=1`);
  return rows[0]?.scenario ?? null;
}

/** Which courses have a final simulation (titles only, no content). */
export async function listSimulations(): Promise<{ course_id: string; title: string }[]> {
  if (!currentSession()) return [];
  return select('course_simulations', 'select=course_id,title:scenario->>title');
}

/** Title and role of a course simulation, without the scenario itself. */
export async function simulationMeta(courseId: string): Promise<{ title: string; role: string } | null> {
  if (!currentSession()) return null;
  const rows = await select<{ title: string; role: string }>('course_simulations', `select=title:scenario->>title,role:scenario->>role&course_id=eq.${courseId}&limit=1`);
  return rows[0] ?? null;
}

export function simFinish(courseId: string, path: number[]) {
  return rpc<{ score: number; max: number; xp: number; ending: SimEnding | null }>('sim_finish', { p_course: courseId, p_path: path });
}

export async function getCertificate(id: string): Promise<Certificate | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return rpc<Certificate | null>('certificate', { p_id: id });
}

/** Scores a path locally (same rules as the server), so the result shows even offline. */
export function scorePath(s: Scenario, path: number[]) {
  let node: SimNode | undefined = s.nodes[s.start];
  let score = 0;
  let max = 0;
  for (const i of path) {
    if (!node) break;
    const c: SimChoice | undefined = node.choices[i];
    if (!c) break;
    score += c.score || 0;
    max += Math.max(0, ...node.choices.map((x) => x.score || 0));
    node = c.next ? s.nodes[c.next] : undefined;
  }
  const pct = max ? score / max : 0;
  const ending = [...s.endings].sort((a, b) => b.min - a.min).find((e) => pct >= e.min) || null;
  return { score, max, pct, ending };
}

/* ---------- Store: one place that knows the member's XP, so every screen reacts to gains ---------- */

type GameEvent =
  | { kind: 'xp'; amount: number }
  | { kind: 'level'; level: ReturnType<typeof levelFor> }
  | { kind: 'badge'; id: string };

let current: Stats | null = null;
let loading: Promise<Stats | null> | null = null;
const listeners = new Set<(s: Stats | null) => void>();
const eventListeners = new Set<(e: GameEvent) => void>();

export function gameStats() {
  return current;
}

export function onGame(fn: (s: Stats | null) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function onGameEvent(fn: (e: GameEvent) => void) {
  eventListeners.add(fn);
  return () => { eventListeners.delete(fn); };
}

function emit(e: GameEvent) {
  eventListeners.forEach((fn) => fn(e));
}

/** Loads stats once (no celebrations on the first load). */
export function loadGame(): Promise<Stats | null> {
  if (current) return Promise.resolve(current);
  if (!loading) {
    loading = myStats()
      .then((s) => {
        current = s;
        listeners.forEach((fn) => fn(s));
        return s;
      })
      .catch(() => null)
      .finally(() => { loading = null; });
  }
  return loading;
}

/** Reloads after something that may have earned XP and celebrates what changed. */
export async function refreshGame(): Promise<Stats | null> {
  const before = current;
  let after: Stats | null = null;
  try {
    after = await myStats();
  } catch {
    return before;
  }
  current = after;
  listeners.forEach((fn) => fn(after));
  if (before && after) {
    const gain = after.xp - before.xp;
    if (gain > 0) emit({ kind: 'xp', amount: gain });
    const l0 = levelFor(before.xp);
    const l1 = levelFor(after.xp);
    if (l1.index > l0.index) emit({ kind: 'level', level: l1 });
    const had = new Set(before.badges.map((b) => b.id));
    after.badges.filter((b) => !had.has(b.id)).forEach((b) => emit({ kind: 'badge', id: b.id }));
  }
  return after;
}

export function resetGame() {
  current = null;
  listeners.forEach((fn) => fn(null));
}
