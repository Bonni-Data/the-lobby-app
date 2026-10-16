import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getLesson, getCourse, listProgress, setProgress, reportContent, track, Lesson as L, LessonDetail } from '../lib/data';
import { Check, checkAnswer, refreshGame, XP } from '../lib/game';
import { speak, stopSpeaking, speechSupported, plainText, RATES, savedRate, saveRate } from '../lib/speech';
import { ArchProgress, Button, ButtonLink, Empty, ErrorState, Screen, Spinner, TopBar, useAsync, toast, formatMinutes, formatDate } from '../components/ui';
import { Link } from '../lib/router';
import {
  LuCircleCheck, LuFileText, LuLink, LuPresentation, LuEyeOff, LuArrowLeft, LuArrowRight, LuHeadphones, LuSquare, LuGalleryHorizontal, LuAlignLeft,
  LuRotateCcw, LuCheck, LuZap, LuListChecks, LuBookMarked, LuMessageSquareWarning, LuExternalLink,
} from 'react-icons/lu';
import { TeacherLine } from '../components/founder';
import { Prose } from '../components/prose';
import { CheckCard, CheckState, checkSpeech, feedbackSpeech, checkKicker } from '../components/checks';

/* ---------- Cards ---------- */

type Card =
  | { kind: 'intro'; text: string }
  | { kind: 'section'; head: string; body: string; n: number }
  | { kind: 'brief'; body: string }
  | { kind: 'check'; check: Check; index: number }
  | { kind: 'end' };

type Section = { head: string; body: string };

function splitSections(text: string): { intro: string; sections: Section[] } {
  const lines = (text || '').replace(/\r/g, '').split('\n');
  const intro: string[] = [];
  const sections: Section[] = [];
  for (const line of lines) {
    if (line.startsWith('## ')) sections.push({ head: line.slice(3).trim(), body: '' });
    else if (sections.length) sections[sections.length - 1].body += line + '\n';
    else intro.push(line);
  }
  return { intro: intro.join('\n').trim(), sections: sections.map((s) => ({ ...s, body: s.body.trim() })) };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-zà-ù0-9]+/g, ' ').trim();

export function buildCards(transcript: string, checks: Check[]): Card[] {
  const { intro, sections } = splitSections(transcript);
  const brief = sections.find((s) => s.head === 'In breve');
  const main = sections.filter((s) => s !== brief);
  const after = new Map<number, { check: Check; index: number }[]>();
  const loose: { check: Check; index: number }[] = [];
  checks.forEach((check, index) => {
    const at = check.after ? main.findIndex((s) => norm(s.head) === norm(check.after!)) : -1;
    if (at >= 0) after.set(at, [...(after.get(at) || []), { check, index }]);
    else loose.push({ check, index });
  });
  // Checks without a place go evenly through the lesson, never before the first section.
  loose.forEach((c, i) => {
    const at = Math.min(main.length - 1, Math.max(0, Math.round(((i + 1) * main.length) / (loose.length + 1)) - 1));
    after.set(at, [...(after.get(at) || []), c]);
  });
  const cards: Card[] = [{ kind: 'intro', text: intro }];
  main.forEach((s, i) => {
    cards.push({ kind: 'section', head: s.head, body: s.body, n: i + 1 });
    (after.get(i) || []).forEach((c) => cards.push({ kind: 'check', ...c }));
  });
  if (!main.length) loose.forEach((c) => cards.push({ kind: 'check', ...c }));
  if (brief) cards.push({ kind: 'brief', body: brief.body });
  cards.push({ kind: 'end' });
  return cards;
}

function keyTerms(body: string) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of body.matchAll(/\*\*([^*]+)\*\*/g)) {
    const t = m[1].trim();
    if (t.length > 32 || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length === 3) break;
  }
  return out;
}

/* ---------- Preferences (per device, best effort) ---------- */

function readPref(key: string, fallback: string) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}
function writePref(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
}

/* ---------- Page ---------- */

export default function Lesson({ id }: { id: string }) {
  const data = useAsync(async () => {
    const lesson = await getLesson(id);
    if (!lesson) return null;
    const [course, progress] = await Promise.all([getCourse(lesson.course_modules.courses.slug), listProgress()]);
    return { lesson, course, progress };
  }, [id]);
  const [mode, setMode] = useState<'cards' | 'page'>(() => (readPref('lobby.lesson.mode', 'cards') === 'page' ? 'page' : 'cards'));
  const [done, setDone] = useState(false);
  const slug = data.data?.lesson?.course_modules?.courses?.slug;

  // Opening a lesson marks it as started; completion survives switching between cards and page.
  useEffect(() => {
    if (!data.data) return;
    const p = data.data.progress.find((x) => x.lesson_id === id);
    setDone(p?.status === 'completed');
    if (!p) setProgress(id, 'in_progress').catch(() => {});
  }, [data.data, id]);
  useEffect(() => { track('lesson_open', { lesson: id }); }, [id]);
  useEffect(() => () => stopSpeaking(), [id]);

  function switchMode() {
    const m = mode === 'cards' ? 'page' : 'cards';
    stopSpeaking();
    setMode(m);
    writePref('lobby.lesson.mode', m);
  }

  return (
    <Screen nav={mode === 'page'} className={mode === 'cards' ? 'screen--player' : ''}>
      <TopBar
        back={slug ? `/corso/${slug}` : '/academy'}
        right={data.data ? (
          <button className="iconbtn mode-btn" onClick={switchMode} aria-label={mode === 'cards' ? 'Leggi tutto in una pagina' : 'Leggi a schede'} title={mode === 'cards' ? 'Pagina unica' : 'A schede'}>
            {mode === 'cards' ? <LuAlignLeft /> : <LuGalleryHorizontal />}
          </button>
        ) : undefined}
      />
      <main className="page page--flush">
        {data.loading && <Spinner />}
        {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
        {data.data === null && <Empty title="Lezione non disponibile" text="Accedi o torna al corso per scegliere un'altra lezione." />}
        {data.data && (
          <LessonBody key={`${id}-${mode}`} mode={mode} lesson={data.data.lesson} course={data.data.course} done={done} setDone={setDone} />
        )}
      </main>
    </Screen>
  );
}

function LessonBody({ mode, lesson, course, done, setDone }: { mode: 'cards' | 'page'; lesson: LessonDetail; course: Awaited<ReturnType<typeof getCourse>>; done: boolean; setDone: (d: boolean) => void }) {
  const [justDone, setJustDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<Record<number, CheckState>>({});

  const flat: L[] = course ? course.course_modules.flatMap((m) => m.lessons) : [];
  const idx = flat.findIndex((l) => l.id === lesson.id);
  const next = idx >= 0 ? flat[idx + 1] : undefined;
  const quiz = lesson.quizzes?.[0];
  const checks = Array.isArray(lesson.checks) ? lesson.checks : [];
  const minutes = Math.max(1, Math.round((lesson.duration_seconds || 300) / 60));

  const complete = useCallback(async () => {
    if (done) return;
    setSaving(true);
    try {
      await setProgress(lesson.id, 'completed');
      setDone(true);
      setJustDone(true);
      refreshGame();
    } catch {
      toast('Salvataggio non riuscito. Riprova.');
    } finally {
      setSaving(false);
    }
  }, [done, lesson.id]);

  async function toggleDone() {
    if (!done) return complete();
    setSaving(true);
    try {
      await setProgress(lesson.id, 'in_progress');
      setDone(false);
    } catch {
      toast('Salvataggio non riuscito. Riprova.');
    } finally {
      setSaving(false);
    }
  }

  function answer(index: number, s: CheckState) {
    setAnswers((a) => (a[index] ? a : { ...a, [index]: s }));
    checkAnswer(lesson.id, index, s.value as any)
      .then((r) => { if (r?.xp) refreshGame(); })
      .catch(() => {});
  }

  const shared = { lesson, idx, total: flat.length || 1, minutes, done, justDone, saving, next, quiz, checks, answers, answer, complete, toggleDone };
  return mode === 'cards' ? <CardPlayer {...shared} /> : <PageView {...shared} />;
}

type Shared = {
  lesson: LessonDetail;
  idx: number;
  total: number;
  minutes: number;
  done: boolean;
  justDone: boolean;
  saving: boolean;
  next?: L;
  quiz?: { id: string; title: string };
  checks: Check[];
  answers: Record<number, CheckState>;
  answer: (index: number, s: CheckState) => void;
  complete: () => Promise<void>;
  toggleDone: () => void;
};

function DraftBanner({ lesson }: { lesson: LessonDetail }) {
  if (lesson.status !== 'draft') return null;
  return (
    <p className="draft-banner">
      <LuEyeOff aria-hidden="true" /> Bozza visibile solo a te.{' '}
      <Link to={`/corso/${lesson.course_modules.courses.slug}`}>Pubblica dal corso</Link>
    </p>
  );
}

/* ---------- Cards mode: one idea at a time, like stories ---------- */

function cardSpeech(c: Card, lesson: LessonDetail): string {
  if (c.kind === 'intro') return `${lesson.title}. ${plainText(c.text)}`;
  if (c.kind === 'section') return plainText(`## ${c.head}\n${c.body}`);
  if (c.kind === 'brief') return `In breve. ${plainText(c.body)}`;
  if (c.kind === 'check') return checkSpeech(c.check);
  return 'Lezione completata.';
}

function CardPlayer(p: Shared) {
  const { lesson } = p;
  const cards = useMemo(() => buildCards(lesson.transcript || '', p.checks), [lesson.id]);
  const posKey = `lobby.card.${lesson.id}`;
  const saved = Number(readPref(posKey, '0')) || 0;
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const [listening, setListening] = useState(false);
  const [rate, setRate] = useState(savedRate);
  const idxRef = useRef(0);
  const listenRef = useRef(false);
  const rateRef = useRef(rate);
  const topRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const canSpeak = speechSupported();

  const card = cards[i];
  const last = cards.length - 1;
  const blocked = card.kind === 'check' && !p.answers[card.index];

  const read = useCallback((at: number) => {
    const c = cards[at];
    speak(cardSpeech(c, lesson), rateRef.current, () => {
      if (!listenRef.current || idxRef.current !== at) return;
      if (c.kind === 'end') { listenRef.current = false; setListening(false); return; }
      if (c.kind === 'check') return; // wait for the answer
      go(at + 1);
    });
  }, [cards]);

  function go(to: number) {
    const n = Math.max(0, Math.min(last, to));
    if (n === idxRef.current) return;
    setDir(n > idxRef.current ? 'fwd' : 'back');
    idxRef.current = n;
    setI(n);
    writePref(posKey, String(n === last ? 0 : n));
    if (listenRef.current) read(n);
    else stopSpeaking();
    const top = topRef.current;
    if (top && top.getBoundingClientRect().top < 0) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      top.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  }

  // Reaching the last card completes the lesson.
  useEffect(() => { if (i === last && !p.done) p.complete(); }, [i]);

  // Keyboard: arrows move between cards.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && /input|textarea|select/i.test(t.tagName)) return;
      if (e.key === 'ArrowRight' && !blockedRef.current) go(idxRef.current + 1);
      if (e.key === 'ArrowLeft') go(idxRef.current - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;

  function toggleListen() {
    if (listenRef.current) {
      listenRef.current = false;
      setListening(false);
      stopSpeaking();
    } else {
      listenRef.current = true;
      setListening(true);
      read(idxRef.current);
    }
  }

  function cycleRate() {
    const r = RATES[(RATES.indexOf(rateRef.current) + 1) % RATES.length];
    rateRef.current = r;
    setRate(r);
    saveRate(r);
    if (listenRef.current) read(idxRef.current);
  }

  function onAnswer(index: number, s: CheckState) {
    p.answer(index, s);
    if (listenRef.current && card.kind === 'check') speak(feedbackSpeech(card.check, s), rateRef.current);
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && !blocked) go(i + 1);
    if (dx > 0) go(i - 1);
  }

  const answered = Object.keys(p.answers).length;
  return (
    <div className="player" ref={topRef}>
      <div className="story-bar" role="progressbar" aria-valuemin={1} aria-valuemax={cards.length} aria-valuenow={i + 1} aria-label={`Scheda ${i + 1} di ${cards.length}`}>
        {cards.map((c, k) => (
          <span key={k} className={`${k < i ? 'is-past' : k === i ? 'is-now' : ''} ${c.kind === 'check' ? 'is-check' : ''}`} />
        ))}
      </div>

      <div className="player__stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <article key={i} className={`lcard lcard--${card.kind} lcard--${dir}`} aria-live="polite">
          {card.kind === 'intro' && (
            <div className="lcard__intro">
              <span className="lcard__arch" aria-hidden="true" />
              <DraftBanner lesson={lesson} />
              <span className="lcard__kicker">
                Lezione {p.idx + 1} di {p.total} · {p.minutes} min · {cards.filter((c) => c.kind === 'section' || c.kind === 'brief').length} schede{p.checks.length ? ` · ${p.checks.length} sfide` : ''}
              </span>
              <p className="crumb crumb--ivory">
                <Link to={`/corso/${lesson.course_modules.courses.slug}`}>{lesson.course_modules.courses.title}</Link>
                <span aria-hidden="true">/</span>
                {lesson.course_modules.title}
              </p>
              <h1 className="lcard__title">{lesson.title}</h1>
              <TeacherLine tone="ivory" label={formatMinutes(lesson.duration_seconds)} />
              {card.text && <p className="lcard__voice">{card.text}</p>}
              {!card.text && lesson.summary && <p className="lcard__voice">{lesson.summary}</p>}
              <div className="lcard__start">
                <Button variant="primary" onClick={() => go(saved > 0 && saved < last ? saved : 1)}>
                  {saved > 0 && saved < last ? `Riprendi dalla scheda ${saved}` : 'Inizia'} <LuArrowRight aria-hidden="true" />
                </Button>
                {saved > 0 && saved < last && <button className="link-ivory" onClick={() => go(1)}>Dall’inizio</button>}
                {p.done && <span className="lcard__done"><LuCircleCheck aria-hidden="true" /> Già completata</span>}
              </div>
            </div>
          )}

          {card.kind === 'section' && (
            <div className="lcard__body">
              <span className="lcard__n" aria-hidden="true">{String(card.n).padStart(2, '0')}</span>
              <h2 className="lcard__head">{card.head}</h2>
              {keyTerms(card.body).length > 0 && (
                <p className="lcard__terms" aria-label="Parole chiave">
                  {keyTerms(card.body).map((t) => <span key={t}>{t}</span>)}
                </p>
              )}
              <Prose text={card.body} />
            </div>
          )}

          {card.kind === 'check' && (
            <div className="lcard__body">
              <CheckCard check={card.check} state={p.answers[card.index]} onAnswer={(s) => onAnswer(card.index, s)} />
              {!p.answers[card.index] && <p className="lcard__xp"><LuZap aria-hidden="true" /> +{XP.check} XP se rispondi giusto al primo colpo</p>}
            </div>
          )}

          {card.kind === 'brief' && (
            <div className="lcard__brief">
              <span className="lcard__kicker"><LuListChecks aria-hidden="true" /> In breve</span>
              <ul>
                {card.body.split('\n').filter((l) => /^(-|\d+\.)\s/.test(l.trim())).map((l, k) => (
                  <li key={k} style={{ animationDelay: `${k * 120}ms` }}>
                    <LuCheck aria-hidden="true" />
                    <span>{l.trim().replace(/^(-|\d+\.)\s+/, '').replace(/\*\*/g, '')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {card.kind === 'end' && <EndCard {...p} answered={answered} onRestart={() => go(0)} />}
        </article>
      </div>

      {card.kind !== 'end' && (
        <nav className="cardnav" aria-label="Schede della lezione">
          <button className="cardnav__btn" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Scheda precedente">
            <LuArrowLeft aria-hidden="true" />
          </button>
          {canSpeak ? (
            <div className={`listen ${listening ? 'is-on' : ''}`}>
              <button className="listen__btn" onClick={toggleListen} aria-pressed={listening}>
                {listening ? <><LuSquare aria-hidden="true" /> <span className="eq" aria-hidden="true"><i /><i /><i /></span> Stop</> : <><LuHeadphones aria-hidden="true" /> Ascolta</>}
              </button>
              <button className="listen__rate" onClick={cycleRate} aria-label={`Velocità di lettura ${rate}x`}>{String(rate).replace('.', ',')}×</button>
            </div>
          ) : <span className="cardnav__count">{i + 1} / {cards.length}</span>}
          <button className={`cardnav__btn cardnav__btn--next ${blocked ? '' : 'is-ready'}`} onClick={() => go(i + 1)} disabled={blocked} aria-label={i === last - 1 ? 'Concludi la lezione' : 'Scheda successiva'}>
            {i === last - 1 ? 'Concludi' : blocked ? 'Rispondi' : 'Avanti'} <LuArrowRight aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}

function EndCard(p: Shared & { answered: number; onRestart: () => void }) {
  const right = Object.values(p.answers).filter((a) => a.correct).length;
  return (
    <div className="lcard__end">
      <ArchProgress value={1} size={72} label="Lezione completata" />
      <h2 className="lcard__title lcard__title--navy">{p.saving ? 'Salvo…' : 'Lezione completata.'}</h2>
      <p className="lcard__score">
        {p.justDone && <span className="pill pill--xp"><LuZap aria-hidden="true" /> +{XP.lesson} XP</span>}
        {p.answered > 0 && <span className="pill">{right} su {p.answered} sfide giuste</span>}
      </p>
      <Assets lesson={p.lesson} />
      <div className="lesson-actions">
        {p.quiz && (
          <ButtonLink to={`/quiz/${p.quiz.id}`} block>
            Fai il quiz · fino a {XP.quizPerfect + 3 * XP.quizPerAnswer} XP
          </ButtonLink>
        )}
        {p.next ? (
          <Link to={`/lezione/${p.next.id}`} className="next-lesson">
            <span>Prossima lezione</span>
            <strong>{p.next.title}</strong>
          </Link>
        ) : (
          <ButtonLink to={`/corso/${p.lesson.course_modules.courses.slug}`} variant="secondary" block>Torna al corso</ButtonLink>
        )}
        <button className="link-quiet center-link" onClick={p.onRestart}><LuRotateCcw aria-hidden="true" /> Rileggi da capo</button>
      </div>
      <LessonFoot lesson={p.lesson} />
    </div>
  );
}

/** Sources, last update and «Segnala un errore»: the honesty footer of every lesson. */
function LessonFoot({ lesson }: { lesson: LessonDetail }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const sources = Array.isArray(lesson.sources) ? lesson.sources.filter((x) => x && x.url) : [];
  const updated = lesson.reviewed_at || lesson.updated_at;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (msg.trim().length < 10) return;
    setBusy(true);
    try {
      await reportContent(lesson.id, msg.trim());
      setSent(true);
      setOpen(false);
      toast('Grazie: la segnalazione è arrivata ad Andrea.');
    } catch (err: any) {
      const m = String(err?.message || '');
      toast(m.includes('too_many') ? 'Hai già inviato diverse segnalazioni oggi: riprova domani.' : 'Invio non riuscito. Riprova.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="lesson-foot" aria-label="Fonti e aggiornamento">
      {sources.length > 0 && (
        <>
          <h2 className="lesson-foot__title"><LuBookMarked aria-hidden="true" /> Fonti</h2>
          <ul className="lesson-foot__sources">
            {sources.map((x, k) => (
              <li key={k}><a href={x.url} target="_blank" rel="noopener noreferrer">{x.title || x.url.replace(/^https?:\/\//, '')} <LuExternalLink aria-hidden="true" /></a></li>
            ))}
          </ul>
        </>
      )}
      {updated && <p className="tiny muted">{lesson.reviewed_at ? 'Ricontrollata sulle fonti il ' : 'Aggiornata il '}{formatDate(updated.slice(0, 10))}.</p>}
      {sent ? (
        <p className="tiny muted">Segnalazione inviata. Grazie per aiutarci a tenere tutto giusto.</p>
      ) : open ? (
        <form className="report" onSubmit={send}>
          <label className="field">
            <span>Cosa non torna?</span>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} maxLength={1000} placeholder="Per esempio: il numero dei consiglieri è cambiato con la legge…" autoFocus />
          </label>
          <div className="report__btns">
            <Button type="submit" loading={busy} disabled={msg.trim().length < 10}>Invia</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annulla</Button>
          </div>
        </form>
      ) : (
        <button className="link-quiet" onClick={() => { setOpen(true); track('report_open'); }}><LuMessageSquareWarning aria-hidden="true" /> Segnala un errore</button>
      )}
    </section>
  );
}

function Assets({ lesson }: { lesson: LessonDetail }) {
  if (!lesson.lesson_assets?.length) return null;
  return (
    <section className="block">
      <h2 className="h-section">Materiali</h2>
      <ul className="assets">
        {lesson.lesson_assets.map((a) => (
          <li key={a.id}>
            <a href={a.ref} target="_blank" rel="noopener noreferrer">
              {a.kind === 'slides' ? <LuPresentation /> : a.kind === 'link' ? <LuLink /> : <LuFileText />}
              {a.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Page mode: the whole lesson on one page ---------- */

function PageView(p: Shared) {
  const { lesson } = p;
  const [listening, setListening] = useState(false);
  const [rate, setRate] = useState(savedRate);
  const canSpeak = speechSupported();

  function toggleListen() {
    if (listening) {
      stopSpeaking();
      setListening(false);
    } else {
      setListening(true);
      speak(`${lesson.title}. ${plainText(lesson.transcript || '')}`, rate, () => setListening(false));
    }
  }

  function cycleRate() {
    const r = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(r);
    saveRate(r);
    if (listening) speak(`${lesson.title}. ${plainText(lesson.transcript || '')}`, r, () => setListening(false));
  }

  return (
    <>
      <div className="lesson-cover">
        <span className="lesson-cover__arch" aria-hidden="true" />
        <span className="lesson-cover__kicker">Lezione {p.idx + 1} di {p.total}</span>
        <span className="lesson-cover__note">
          {lesson.course_modules.courses.access_level === 'premium' ? 'Lezione Premium' : 'Lezione'} da leggere in {p.minutes} minuti
        </span>
      </div>
      <div className="page">
        <DraftBanner lesson={lesson} />
        <p className="crumb">
          <Link to={`/corso/${lesson.course_modules.courses.slug}`}>{lesson.course_modules.courses.title}</Link>
          <span aria-hidden="true">/</span>
          {lesson.course_modules.title}
        </p>
        <h1 className="h-title">{lesson.title}</h1>
        <TeacherLine label={formatMinutes(lesson.duration_seconds)} />
        {canSpeak && (
          <div className={`listen listen--page ${listening ? 'is-on' : ''}`}>
            <button className="listen__btn" onClick={toggleListen} aria-pressed={listening}>
              {listening ? <><LuSquare aria-hidden="true" /> <span className="eq" aria-hidden="true"><i /><i /><i /></span> Ferma la lettura</> : <><LuHeadphones aria-hidden="true" /> Ascolta la lezione</>}
            </button>
            <button className="listen__rate" onClick={cycleRate} aria-label={`Velocità di lettura ${rate}x`}>{String(rate).replace('.', ',')}×</button>
          </div>
        )}
        {lesson.summary && <p className="lede">{lesson.summary}</p>}
        {lesson.transcript && <Prose text={lesson.transcript} />}

        {p.checks.length > 0 && (
          <section className="block page-checks">
            <h2 className="h-section">Mettiti alla prova</h2>
            {p.checks.map((c, k) => (
              <div key={k} className="page-check" aria-label={checkKicker(c)}>
                <CheckCard check={c} state={p.answers[k]} onAnswer={(s) => p.answer(k, s)} />
              </div>
            ))}
          </section>
        )}

        <Assets lesson={lesson} />

        <div className="lesson-actions">
          <Button variant={p.done ? 'secondary' : 'primary'} block loading={p.saving} onClick={p.toggleDone}>
            {p.done ? (<><LuCircleCheck /> Completata</>) : `Segna come completata · +${XP.lesson} XP`}
          </Button>
          {p.quiz && (
            <ButtonLink to={`/quiz/${p.quiz.id}`} variant="secondary" block>
              Fai il quiz
            </ButtonLink>
          )}
          {p.next && (
            <Link to={`/lezione/${p.next.id}`} className="next-lesson">
              <span>Prossima lezione</span>
              <strong>{p.next.title}</strong>
            </Link>
          )}
        </div>
        <LessonFoot lesson={lesson} />
      </div>
    </>
  );
}
