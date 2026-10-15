import { select, upsert, update, rpc, currentSession } from './api';
import { NOTIFY_ENDPOINT, APP_URL } from '../config';

export type Lesson = {
  id: string;
  position: number;
  title: string;
  summary?: string | null;
  duration_seconds?: number | null;
  video_ref?: string | null;
  transcript?: string | null;
  status?: string;
  module_id?: string;
};
export type Module = { id: string; position: number; title: string; description?: string | null; lessons: Lesson[] };
export type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  audience?: string | null;
  level: 'base' | 'intermedio' | 'avanzato';
  access_level: 'free' | 'premium';
  coming_soon?: boolean;
  position?: number | null;
  category?: CategoryId | null;
  /** 'testo': lessons to read with quizzes. 'live': sessions on Teams with Andrea, booked from the course page. */
  format?: 'testo' | 'live' | null;
  objectives: string[];
  course_modules: Module[];
};
export type Progress = { lesson_id: string; status: 'in_progress' | 'completed'; completed_at?: string | null; updated_at: string };
export type OppTag = 'viaggio' | 'lavoro' | 'sviluppo';
export type Opportunity = {
  id: string;
  title: string | null;
  organization?: string | null;
  category: string;
  tag: OppTag;
  summary?: string | null;
  requirements?: string | null;
  covered?: string | null;
  location?: string | null;
  deadline?: string | null;
  deadline_note?: string | null;
  opens_on?: string | null;
  url?: string | null;
  source?: string | null;
  is_new: boolean;
  locked: boolean;
};
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type MyApplication = {
  status: ApplicationStatus;
  created_at: string;
  reviewed_at?: string | null;
  reviewer_note?: string | null;
  retry_after?: string | null;
};
export type Plan = { premium: boolean; admin: boolean; application: MyApplication | null };
export type Application = MyApplication & {
  id: string;
  full_name: string;
  email: string;
  about: string;
  experience: string;
  goal: string;
  link?: string | null;
};
export type QuizQuestion = { id: string; position: number; prompt: string; options: string[] };
export type Quiz = { id: string; title: string; lesson_id: string; quiz_questions: QuizQuestion[] };
export type QuizResult = {
  score: number;
  max_score: number;
  details: { question_id: string; correct_option: number | null; chosen: number | null; explanation?: string | null }[];
};

const COURSE_FIELDS =
  'id,slug,title,subtitle,description,audience,level,access_level,objectives,coming_soon,position,category,format,' +
  'course_modules(id,position,title,description,lessons(id,position,title,summary,duration_seconds,status))';

function sortCourse(c: Course): Course {
  const mods = [...(c.course_modules || [])].sort((a, b) => a.position - b.position);
  // Archived lessons (only the founder can read them) never count as course content.
  mods.forEach((m) => (m.lessons = (m.lessons || []).filter((l) => l.status !== 'archived').sort((a, b) => a.position - b.position)));
  return { ...c, objectives: c.objectives || [], course_modules: mods };
}

export async function listCourses(): Promise<Course[]> {
  const rows = await select<Course>('courses', `select=${COURSE_FIELDS}&status=eq.published&order=position.asc.nullslast,created_at.asc`);
  return rows.map(sortCourse);
}

export async function getCourse(slug: string): Promise<Course | null> {
  const rows = await select<Course>('courses', `select=${COURSE_FIELDS}&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  return rows[0] ? sortCourse(rows[0]) : null;
}

export type LessonDetail = Lesson & {
  course_modules: { id: string; title: string; position: number; courses: { slug: string; title: string; access_level?: 'free' | 'premium' } };
  quizzes: { id: string; title: string }[];
  lesson_assets: { id: string; kind: string; title: string; ref: string }[];
};

export async function getLesson(id: string): Promise<LessonDetail | null> {
  const rows = await select<LessonDetail>(
    'lessons',
    `select=id,position,title,summary,duration_seconds,video_ref,transcript,status,module_id,` +
      `course_modules(id,title,position,courses(slug,title,access_level)),quizzes(id,title),lesson_assets(id,kind,title,ref)` +
      `&id=eq.${id}&limit=1`,
  );
  return rows[0] ?? null;
}

export async function listProgress(): Promise<Progress[]> {
  if (!currentSession()) return [];
  return select<Progress>('lesson_progress', 'select=lesson_id,status,completed_at,updated_at&order=updated_at.desc');
}

export async function setProgress(lessonId: string, status: 'in_progress' | 'completed') {
  const s = currentSession();
  if (!s) return;
  await upsert(
    'lesson_progress',
    {
      user_id: s.user.id,
      lesson_id: lessonId,
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    },
    'user_id,lesson_id',
  );
}

export async function getQuiz(id: string): Promise<Quiz | null> {
  const rows = await select<Quiz>('quizzes', `select=id,title,lesson_id,quiz_questions(id,position,prompt,options)&id=eq.${id}&limit=1`);
  const q = rows[0];
  if (!q) return null;
  q.quiz_questions = [...q.quiz_questions].sort((a, b) => a.position - b.position);
  return q;
}

export function submitQuiz(quizId: string, answers: Record<string, number>) {
  return rpc<QuizResult>('submit_quiz_attempt', { p_quiz_id: quizId, p_answers: answers });
}

export async function listAttempts() {
  if (!currentSession()) return [];
  return select<{ quiz_id: string; score: number; max_score: number; created_at: string }>(
    'quiz_attempts',
    'select=quiz_id,score,max_score,created_at&order=created_at.desc',
  );
}

/** Ranked feed: free members get the first 3 in full, the rest come back locked. */
export async function listOpportunities(): Promise<Opportunity[]> {
  if (!currentSession()) return [];
  return (await rpc<Opportunity[]>('opportunities_feed', {})) || [];
}

export const FREE_PLAN: Plan = { premium: false, admin: false, application: null };

export async function getPlan(): Promise<Plan> {
  if (!currentSession()) return FREE_PLAN;
  const p = await rpc<Plan>('my_plan', {});
  return { premium: !!p?.premium, admin: !!p?.admin, application: p?.application ?? null };
}

export type ApplicationInput = { about: string; experience: string; goal: string; link: string };

/** Saves the application (source of truth) and forwards a copy to the THE LOBBY inbox. */
export async function submitApplication(input: ApplicationInput) {
  const saved = await rpc<{ id: string; full_name: string; email: string; created_at: string }>('submit_premium_application', {
    p_about: input.about,
    p_experience: input.experience,
    p_goal: input.goal,
    p_link: input.link || null,
  });
  // Best effort: the application is already stored, the email is only a notification.
  fetch(NOTIFY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      _subject: `Nuova candidatura Premium: ${saved.full_name}`,
      _template: 'box',
      _captcha: 'false',
      Nome: saved.full_name,
      Email: saved.email,
      'Chi sono oggi': input.about,
      'Cosa ho fatto finora': input.experience,
      'Il mio prossimo livello': input.goal,
      Link: input.link || '-',
      'Valuta e attiva': `${APP_URL}#/admin`,
    }),
  }).catch(() => {});
  return saved;
}

export async function listApplications(): Promise<Application[]> {
  return select<Application>('premium_applications', 'select=*&order=created_at.desc');
}

export async function reviewApplication(id: string, decision: 'approved' | 'rejected', note: string) {
  await rpc('review_premium_application', { p_id: id, p_decision: decision, p_note: note || null });
}

export async function getProfile() {
  const s = currentSession();
  if (!s) return null;
  const rows = await select<{ id: string; display_name: string | null }>('profiles', `select=id,display_name&id=eq.${s.user.id}`);
  return rows[0] ?? null;
}

export async function saveDisplayName(name: string) {
  const s = currentSession();
  if (!s) return;
  await update('profiles', `id=eq.${s.user.id}`, { display_name: name });
}

export async function assertEmailAvailable(email: string) {
  await rpc('assert_email_available', { p_email: email });
}

// ---------- helpers ----------
export function lessonCount(c: Course) {
  return c.course_modules.reduce((n, m) => n + m.lessons.length, 0);
}

export function courseMinutes(c: Course) {
  const secs = c.course_modules.reduce((n, m) => n + m.lessons.reduce((k, l) => k + (l.duration_seconds || 0), 0), 0);
  return Math.max(1, Math.round(secs / 60));
}

export function completedIn(c: Course, progress: Progress[]) {
  const done = new Set(progress.filter((p) => p.status === 'completed').map((p) => p.lesson_id));
  return c.course_modules.reduce((n, m) => n + m.lessons.filter((l) => done.has(l.id)).length, 0);
}

export function nextLesson(c: Course, progress: Progress[]): Lesson | null {
  const done = new Set(progress.filter((p) => p.status === 'completed').map((p) => p.lesson_id));
  for (const m of c.course_modules) for (const l of m.lessons) if (!done.has(l.id)) return l;
  return null;
}

/** Lessons still waiting for the founder's approval (only the admin can see them). */
export function draftCount(c: Course) {
  return c.course_modules.reduce((n, m) => n + m.lessons.filter((l) => l.status === 'draft').length, 0);
}

/** Admin: publish every draft lesson of a course and take it out of «in arrivo». */
export async function publishCourse(slug: string) {
  return rpc<number>('publish_course', { p_slug: slug });
}

export const LEVEL_LABEL: Record<string, string> = { base: 'Base', intermedio: 'Intermedio', avanzato: 'Avanzato' };
export const CATEGORY_LABEL: Record<string, string> = {
  bando: 'Bando',
  tirocinio: 'Tirocinio',
  lavoro: 'Lavoro',
  evento: 'Evento',
  finanziamento: 'Finanziamento',
  formazione: 'Formazione',
  volontariato: 'Volontariato',
  concorso: 'Concorso',
  programma: 'Programma',
};
export const TAG_LABEL: Record<OppTag, string> = { viaggio: 'Viaggio spesato', lavoro: 'Lavoro', sviluppo: 'Sviluppo' };
export const FREE_OPPORTUNITIES = 3;

/** Days left until a YYYY-MM-DD date (local), or null. */
export function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  const end = new Date(y, m - 1, d).getTime();
  const t = new Date();
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  return Math.round((end - today) / 86400000);
}

// ---------- Premium events (cene) ----------
export type EventItem = {
  id: string;
  kind: 'cena' | 'incontro' | 'lezione' | 'evento';
  title: string;
  summary?: string | null;
  starts_at?: string | null;
  location?: string | null;
  seats?: number | null;
  yes_count: number;
  my_response?: 'yes' | 'no' | null;
  locked: boolean;
};

export async function listEvents(kind?: EventItem['kind']): Promise<EventItem[]> {
  if (!currentSession()) return [];
  return (await rpc<EventItem[]>('events_feed', { p_kind: kind ?? null })) || [];
}

export function rsvpEvent(eventId: string, response: 'yes' | 'no') {
  return rpc<{ response: 'yes' | 'no'; yes_count: number }>('rsvp_event', { p_event: eventId, p_response: response });
}

export type Attendee = { full_name: string; email: string; response: 'yes' | 'no'; updated_at: string };
export async function eventAttendees(eventId: string): Promise<Attendee[]> {
  return (await rpc<Attendee[]>('event_attendees', { p_event: eventId })) || [];
}

export type NewEvent = { title: string; summary: string; starts_at: string; location: string; seats: number | null };
export async function createDinner(e: NewEvent) {
  await upsert('premium_events', { kind: 'cena', status: 'published', ...e });
}

export async function archiveEvent(id: string) {
  await update('premium_events', `id=eq.${id}`, { status: 'archived' });
}

// ---------- Course outline (titles only, for previews) ----------
export type OutlineLesson = { module_id: string; lesson_id: string; lesson_position: number; title: string; duration_seconds: number | null };
export async function courseOutline(courseId: string): Promise<OutlineLesson[]> {
  return (await rpc<OutlineLesson[]>('course_outline', { p_course: courseId })) || [];
}

/** Label for course doors: level, Premium, coming soon. */
export type CategoryId = 'europa' | 'italia' | 'comune' | 'skill';
export const CATEGORIES: { id: CategoryId; label: string; blurb: string }[] = [
  { id: 'europa', label: 'Europa', blurb: 'Come funziona l\u2019Unione e come coglierne le opportunit\u00e0.' },
  { id: 'italia', label: 'Italia', blurb: 'Parlamento, governo, conti pubblici e la storia che li spiega.' },
  { id: 'comune', label: 'Comune', blurb: 'Il livello pi\u00f9 vicino a te: come funziona e come entrarci.' },
  { id: 'skill', label: 'Skill personali', blurb: 'Parlare, convincere, costruire relazioni: le competenze di chi fa politica.' },
];
export const CATEGORY_NAME: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
export const categoryOf = (c: Course): CategoryId => (c.category as CategoryId) || 'italia';

export const isLive = (c: Pick<Course, 'format'>) => c.format === 'live';

export function courseLabel(c: Course) {
  return CATEGORY_NAME[categoryOf(c)] + (c.access_level === 'premium' ? ' · Premium' : '') + (isLive(c) ? ' · Live' : c.coming_soon && lessonCount(c) === 0 ? ' · In arrivo' : '');
}

// ---------- Live courses (Teams with Andrea, start at 15 bookings) ----------
export type LiveEdition = {
  course_id: string;
  event_id: string;
  yes_count: number;
  min_seats: number;
  my_response: 'yes' | 'no' | null;
  starts_at: string | null;
  /** Only for the founder and for enrolled Premium members. */
  join_url: string | null;
};

export async function listLive(): Promise<LiveEdition[]> {
  if (!currentSession()) return [];
  return (await rpc<LiveEdition[]>('live_courses', {})) || [];
}

export function liveSchedule(eventId: string, startsAt: string, joinUrl: string) {
  return rpc('live_schedule', { p_event: eventId, p_starts_at: startsAt, p_join_url: joinUrl });
}

/** Founder: the session happened; archive it and open the next edition. */
export function liveComplete(eventId: string) {
  return rpc<string>('live_complete', { p_event: eventId });
}

/** Past more than 3 hours ago: that edition is over. */
export function liveIsOver(e: Pick<LiveEdition, 'starts_at'>) {
  return !!e.starts_at && new Date(e.starts_at).getTime() < Date.now() - 3 * 3600_000;
}
