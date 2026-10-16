import { select, upsert, update, rpc, currentSession, storageUpload, storageRemove } from './api';
import { SUPABASE_URL } from '../config';
import type { Check } from './game';

export type Lesson = {
  id: string;
  position: number;
  title: string;
  summary?: string | null;
  duration_seconds?: number | null;
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
export type Plan = { premium: boolean; admin: boolean; application: MyApplication | null; email_verified: boolean };
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

export type Source = { title: string; url: string };
export type LessonDetail = Lesson & {
  sources?: Source[] | null;
  reviewed_at?: string | null;
  updated_at?: string | null;
  course_modules: { id: string; title: string; position: number; courses: { slug: string; title: string; access_level?: 'free' | 'premium' } };
  quizzes: { id: string; title: string }[];
  /** Interactive checks shown between the lesson cards. */
  checks?: Check[] | null;
  lesson_assets: { id: string; kind: string; title: string; ref: string }[];
};

export async function getLesson(id: string): Promise<LessonDetail | null> {
  const rows = await select<LessonDetail>(
    'lessons',
    `select=id,position,title,summary,duration_seconds,transcript,checks,lesson_checks(checks),status,module_id,sources,reviewed_at,updated_at,` +
      `course_modules(id,title,position,courses(slug,title,access_level)),quizzes(id,title),lesson_assets(id,kind,title,ref)` +
      `&id=eq.${id}&limit=1`,
  );
  const row = rows[0] as (LessonDetail & { lesson_checks?: { checks: Check[] } | { checks: Check[] }[] | null }) | undefined;
  if (!row) return null;
  const own = Array.isArray(row.lesson_checks) ? row.lesson_checks[0] : row.lesson_checks;
  row.checks = own?.checks?.length ? own.checks : Array.isArray(row.checks) ? row.checks : [];
  delete row.lesson_checks;
  return row;
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

/** Ranked feed, open to everyone (also without an account). */
export async function listOpportunities(): Promise<Opportunity[]> {
  return (await rpc<Opportunity[]>('opportunities_feed', {})) || [];
}

export const FREE_PLAN: Plan = { premium: false, admin: false, application: null, email_verified: true };

export async function getPlan(): Promise<Plan> {
  if (!currentSession()) return FREE_PLAN;
  const p = await rpc<Plan>('my_plan', {});
  return { premium: !!p?.premium, admin: !!p?.admin, application: p?.application ?? null, email_verified: p?.email_verified !== false };
}

export type ApplicationInput = { about: string; experience: string; goal: string; link: string };

/** Saves the application; the database emails a copy to the founder. */
export async function submitApplication(input: ApplicationInput) {
  return rpc<{ id: string; full_name: string; email: string; created_at: string }>('submit_premium_application', {
    p_about: input.about,
    p_experience: input.experience,
    p_goal: input.goal,
    p_link: input.link || null,
  });
}

// ---------- Email ----------
export function confirmEmail(token: string) {
  return rpc<'ok' | 'invalid' | 'expired'>('confirm_email', { p_token: token });
}

export function resendVerification() {
  return rpc<'sent' | 'already'>('resend_verification', {});
}

export type EmailStatus = { live: boolean; from_email: string | null; admin_email: string; sent_7d: number; queued: number; errors_7d: number; last_sent_at: string | null };
export function emailStatus() {
  return rpc<EmailStatus>('email_status', {});
}

export type GrowthStats = { members: number; last_7d: number; verified: number; premium: number; pending: number; sources: { source: string; n: number }[] };
export function growthStats() {
  return rpc<GrowthStats>('growth_stats', {});
}

export function sendTestEmail() {
  return rpc<string>('email_send_test', {});
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
  const rows = await select<{ id: string; display_name: string | null; avatar_url: string | null }>('profiles', `select=id,display_name,avatar_url&id=eq.${s.user.id}`);
  return rows[0] ?? null;
}

export async function saveDisplayName(name: string) {
  const s = currentSession();
  if (!s) return;
  await update('profiles', `id=eq.${s.user.id}`, { display_name: name });
}

/** «Nome Cognome»: at least two words of two letters or more. */
export function isFullName(v: string) {
  const parts = v.trim().split(/\s+/).filter((w) => w.replace(/[^\p{L}]/gu, '').length >= 2);
  return parts.length >= 2;
}

/** Profile photo: one square JPEG per member in the public 'avatars' bucket, at <user id>/avatar.jpg. */
export async function saveAvatar(photo: Blob): Promise<string> {
  const s = currentSession();
  if (!s) throw new Error('not_authenticated');
  const path = `${s.user.id}/avatar.jpg`;
  await storageUpload('avatars', path, photo, 'image/jpeg');
  const url = `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}?v=${Date.now()}`;
  await update('profiles', `id=eq.${s.user.id}`, { avatar_url: url });
  return url;
}

export async function removeAvatar() {
  const s = currentSession();
  if (!s) return;
  await storageRemove('avatars', [`${s.user.id}/avatar.jpg`]);
  await update('profiles', `id=eq.${s.user.id}`, { avatar_url: null });
}

/** Turns any photo into a centred square JPEG (faces sit high in portraits, so the crop leans to the top). */
export async function squarePhoto(file: File, size = 360): Promise<Blob> {
  let src: CanvasImageSource;
  let w: number;
  let h: number;
  let url = '';
  try {
    const bmp = await createImageBitmap(file);
    src = bmp; w = bmp.width; h = bmp.height;
  } catch {
    url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    src = img; w = img.naturalWidth; h = img.naturalHeight;
  }
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = h > w ? (h - side) * 0.25 : (h - side) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(src, sx, sy, side, side, 0, 0, size, size);
  if (url) URL.revokeObjectURL(url);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode_failed'))), 'image/jpeg', 0.86));
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
export type CategoryId = 'europa' | 'italia' | 'comune' | 'skill' | 'attualita';
export const CATEGORIES: { id: CategoryId; label: string; blurb: string }[] = [
  { id: 'europa', label: 'Europa', blurb: 'Come funziona l\u2019Unione e come coglierne le opportunit\u00e0.' },
  { id: 'italia', label: 'Italia', blurb: 'Parlamento, governo, conti pubblici e la storia che li spiega.' },
  { id: 'comune', label: 'Comune', blurb: 'Il livello pi\u00f9 vicino a te: come funziona e come entrarci.' },
  { id: 'skill', label: 'Skill personali', blurb: 'Parlare, convincere, costruire relazioni: le competenze di chi fa politica.' },
  { id: 'attualita', label: 'Attualit\u00e0', blurb: 'Intelligenza artificiale, clima, lavoro, fisco, nuove leggi: i temi del presente, aggiornati ogni mese.' },
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

// ---------- Faccia a faccia con Andrea: meeting requests ----------
export type MeetingTopic = 'testo' | 'domande' | 'consiglio' | 'altro';
export type MeetingMode = 'video' | 'telefono' | 'presenza';
export type MeetingRequest = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  topic: MeetingTopic;
  message: string;
  link: string | null;
  minutes: 5 | 15 | 30;
  mode: MeetingMode;
  availability: string | null;
  status: 'nuova' | 'gestita';
  created_at: string;
  handled_at: string | null;
};
export type MeetingInput = Pick<MeetingRequest, 'name' | 'email' | 'phone' | 'topic' | 'message' | 'link' | 'minutes' | 'mode' | 'availability'>;

export const MEETING_TOPICS: { id: MeetingTopic; label: string }[] = [
  { id: 'testo', label: 'Rivedere un testo' },
  { id: 'domande', label: 'Fare domande' },
  { id: 'consiglio', label: 'Un consiglio' },
  { id: 'altro', label: 'Altro' },
];
export const MEETING_MODES: { id: MeetingMode; label: string }[] = [
  { id: 'video', label: 'Videochiamata' },
  { id: 'telefono', label: 'Telefono' },
  { id: 'presenza', label: 'Di persona' },
];

export function requestMeeting(m: MeetingInput) {
  return rpc<{ id: string; created_at: string }>('request_meeting', {
    p_name: m.name, p_email: m.email, p_phone: m.phone || null, p_topic: m.topic, p_message: m.message,
    p_link: m.link || null, p_minutes: m.minutes, p_mode: m.mode, p_availability: m.availability || null,
  });
}

export async function myMeetings(): Promise<MeetingRequest[]> {
  const s = currentSession();
  if (!s) return [];
  return select<MeetingRequest>('meeting_requests', `select=*&user_id=eq.${s.user.id}&order=created_at.desc&limit=3`);
}

export async function listMeetings(): Promise<MeetingRequest[]> {
  return select<MeetingRequest>('meeting_requests', 'select=*&order=created_at.desc&limit=200');
}

export async function setMeetingStatus(id: string, status: 'nuova' | 'gestita') {
  await update('meeting_requests', `id=eq.${id}`, { status, handled_at: status === 'gestita' ? new Date().toISOString() : null });
}

// ---------- Learning path: «Da cittadino a protagonista» ----------
export type PathStage = {
  id: string;
  position: number;
  title: string;
  skill: string;
  summary?: string | null;
  premium: boolean;
  items: { course_id: string; position: number; optional: boolean }[];
};
export const PATH_NAME = 'Da cittadino a protagonista';

export async function listPath(): Promise<PathStage[]> {
  const [stages, items] = await Promise.all([
    select<Omit<PathStage, 'items'>>('path_stages', 'select=id,position,title,skill,summary,premium&order=position.asc'),
    select<{ course_id: string; stage_id: string; position: number; optional: boolean }>('path_items', 'select=course_id,stage_id,position,optional&order=position.asc'),
  ]);
  return stages.map((st) => ({ ...st, items: items.filter((i) => i.stage_id === st.id).sort((a, b) => a.position - b.position) }));
}

export type StageView = PathStage & {
  courses: (Course & { optional: boolean })[];
  done: number;
  total: number;
  state: 'done' | 'current' | 'todo';
};
export type PathView = {
  stages: StageView[];
  /** Recommended next step: first required course of the free path not completed yet. */
  next: { stage: StageView; course: Course; lesson: Lesson | null; index: number } | null;
  freeStages: number;
  doneStages: number;
  /** Published courses that are not in the path yet (new courses land here until they get a stage). */
  others: Course[];
};

export function pathView(stages: PathStage[], courses: Course[], progress: Progress[]): PathView {
  const byId = new Map(courses.map((c) => [c.id, c]));
  const inPath = new Set<string>();
  const views: StageView[] = stages.map((st) => {
    const list = st.items
      .map((i) => {
        inPath.add(i.course_id);
        const c = byId.get(i.course_id);
        return c ? { ...c, optional: i.optional } : null;
      })
      .filter((c): c is Course & { optional: boolean } => !!c);
    const required = list.filter((c) => !c.optional && lessonCount(c) > 0);
    const total = required.reduce((n, c) => n + lessonCount(c), 0);
    const done = required.reduce((n, c) => n + completedIn(c, progress), 0);
    const state: StageView['state'] = total > 0 && done >= total ? 'done' : 'todo';
    return { ...st, courses: list, done, total, state };
  });
  let next: PathView['next'] = null;
  const index = views.findIndex((v) => !v.premium && v.state !== 'done');
  if (index >= 0) {
    const stage = views[index];
    stage.state = 'current';
    const course = stage.courses.find((c) => !c.optional && lessonCount(c) > 0 && completedIn(c, progress) < lessonCount(c)) || stage.courses[0];
    if (course) next = { stage, course, lesson: nextLesson(course, progress), index };
  }
  const free = views.filter((v) => !v.premium);
  return {
    stages: views,
    next,
    freeStages: free.length,
    doneStages: free.filter((v) => v.state === 'done').length,
    others: courses.filter((c) => !inPath.has(c.id)),
  };
}

// ---------- Analytics without cookies ----------
/** Fire-and-forget event; visitors are counted without any identifier. */
export function track(name: string, props?: Record<string, string | number | boolean>) {
  try {
    const path = (window.location.hash.replace(/^#/, '').split('?')[0] || '/').slice(0, 120);
    rpc('track', { p_name: name, p_path: path, p_props: props || {} }).catch(() => {});
  } catch {
    /* never block the app for analytics */
  }
}

// ---------- Email preferences ----------
export type EmailPrefs = { digest: boolean; reminders: boolean };
export function myEmailPrefs() {
  return rpc<EmailPrefs>('my_email_prefs', {});
}
export function setEmailPrefs(p: EmailPrefs) {
  return rpc<EmailPrefs>('set_email_prefs', { p_digest: p.digest, p_reminders: p.reminders });
}
export function emailUnsubscribe(token: string, what: string) {
  return rpc<'ok' | 'invalid'>('email_unsubscribe', { p_token: token, p_what: what });
}

// ---------- Report an error in a lesson ----------
export function reportContent(lessonId: string, message: string) {
  return rpc<string>('report_content', { p_lesson: lessonId, p_message: message });
}
export type ContentReport = { id: string; lesson_id: string; message: string; status: 'nuova' | 'gestita'; created_at: string; lessons?: { title: string } | null };
export async function listReports(): Promise<ContentReport[]> {
  return select<ContentReport>('content_reports', 'select=id,lesson_id,message,status,created_at,lessons(title)&order=created_at.desc&limit=100');
}
export async function setReportStatus(id: string, status: 'nuova' | 'gestita') {
  await update('content_reports', `id=eq.${id}`, { status, handled_at: status === 'gestita' ? new Date().toISOString() : null });
}

// ---------- Invite a friend ----------
export function myInvite() {
  return rpc<{ code: string; joined: number }>('my_invite', {});
}
export const inviteLink = (code: string) => `https://thelobbyitalia.it/?invito=${encodeURIComponent(code)}`;

// ---------- Founder numbers ----------
export type Metrics = {
  members: number; new_7d: number; new_30d: number; active_7d: number;
  activated: number; activated_24h: number; eligible_d7: number; returned_d7: number;
  visits_7d: number; opp_clicks_7d: number; invited: number;
  applications_pending: number; premium: number; reports_open: number;
  digest_subs: number; sent_24h: number; sent_month: number; deferred: number;
  stages: { title: string; n: number }[];
  signups_by_day: { d: string; n: number }[];
  sources: { source: string; n: number }[];
};
export function adminMetrics() {
  return rpc<Metrics>('admin_metrics', {});
}
