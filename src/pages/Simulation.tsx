import React, { useEffect, useRef, useState } from 'react';
import { getCourse, listProgress, completedIn, lessonCount } from '../lib/data';
import { getSimulation, simFinish, scorePath, refreshGame, Scenario, SimEnding, XP } from '../lib/game';
import { ArchProgress, Button, ButtonLink, Empty, ErrorState, Screen, Spinner, TopBar, useAsync } from '../components/ui';
import { LuSwords, LuArrowRight, LuRotateCcw, LuLock, LuZap, LuCheck, LuMinus, LuTriangleAlert } from 'react-icons/lu';

const RATING = [
  { label: 'Mossa rischiosa', cls: 'is-low', icon: <LuTriangleAlert aria-hidden="true" /> },
  { label: 'Mossa discreta', cls: 'is-mid', icon: <LuMinus aria-hidden="true" /> },
  { label: 'Mossa da manuale', cls: 'is-top', icon: <LuCheck aria-hidden="true" /> },
];

function rating(score: number, best: number) {
  if (best <= 0) return RATING[1];
  const r = score / best;
  return r >= 1 ? RATING[2] : r > 0 ? RATING[1] : RATING[0];
}

export default function Simulation({ slug }: { slug: string }) {
  const data = useAsync(async () => {
    const course = await getCourse(slug);
    if (!course) return null;
    const [scenario, progress] = await Promise.all([getSimulation(course.id), listProgress()]);
    return { course, scenario, progress };
  }, [slug]);

  return (
    <Screen nav={false} className="screen--sim">
      <TopBar back={`/corso/${slug}`} title="Simulazione finale" />
      <main className="page page--flush">
        {data.loading && <Spinner />}
        {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
        {data.data === null && <Empty title="Corso non trovato" />}
        {data.data && !data.data.scenario && <Empty title="Simulazione non disponibile" text="Per questo corso la simulazione arriva a breve." action={<ButtonLink to={`/corso/${slug}`}>Torna al corso</ButtonLink>} />}
        {data.data?.scenario && (() => {
          const { course, scenario, progress } = data.data;
          const total = lessonCount(course);
          const done = completedIn(course, progress);
          if (total > 0 && done < total) {
            return (
              <section className="sim-locked">
                <LuLock aria-hidden="true" />
                <h1 className="h-title">Prima le lezioni.</h1>
                <p>La simulazione mette alla prova quello che hai imparato: si sblocca quando completi tutte le lezioni del corso. Ne hai fatte {done} su {total}.</p>
                <ButtonLink to={`/corso/${slug}`}>Torna al corso</ButtonLink>
              </section>
            );
          }
          return <Player courseId={course.id} slug={slug} courseTitle={course.title} s={scenario} />;
        })()}
      </main>
    </Screen>
  );
}

type Step = { node: string; choice: number };

function Player({ courseId, slug, courseTitle, s }: { courseId: string; slug: string; courseTitle: string; s: Scenario }) {
  const [started, setStarted] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [node, setNode] = useState(s.start);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<{ score: number; max: number; xp: number; ending: SimEnding | null } | null>(null);
  const [sending, setSending] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const current = s.nodes[node];
  const decisions = steps.length + 1;

  useEffect(() => {
    const el = topRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' });
  }, [node, picked, result, started]);

  function choose(i: number) {
    if (picked !== null) return;
    setPicked(i);
  }

  async function proceed() {
    if (picked === null) return;
    const step = { node, choice: picked };
    const all = [...steps, step];
    const next = current.choices[picked].next;
    setSteps(all);
    setPicked(null);
    if (next && s.nodes[next]) {
      setNode(next);
      return;
    }
    const path = all.map((x) => x.choice);
    const local = scorePath(s, path);
    setResult({ score: local.score, max: local.max, xp: 0, ending: local.ending });
    setSending(true);
    try {
      const r = await simFinish(courseId, path);
      setResult({ score: r.score, max: r.max, xp: r.xp, ending: r.ending || local.ending });
      if (r.xp > 0) refreshGame();
    } catch {
      /* the local result is already on screen */
    } finally {
      setSending(false);
    }
  }

  function restart() {
    setSteps([]);
    setNode(s.start);
    setPicked(null);
    setResult(null);
    setStarted(true);
  }

  if (!started) {
    return (
      <section className="sim-intro" ref={topRef}>
        <span className="sim-intro__arch" aria-hidden="true" />
        <span className="sim__kicker"><LuSwords aria-hidden="true" /> Simulazione finale · {courseTitle}</span>
        <h1 className="sim-intro__title">{s.title}</h1>
        <p className="sim__role">Il tuo ruolo: <strong>{s.role}</strong></p>
        <p className="sim-intro__text">{s.intro}</p>
        <ul className="sim-intro__rules">
          <li>Poche decisioni, nessuna risposta perfetta scritta da qualche parte: scegli come faresti davvero.</li>
          <li>Ogni scelta ha conseguenze. Alla fine scopri come è andata.</li>
          <li>Fino a {XP.sim} XP. Puoi rigiocarla quando vuoi: conta il risultato migliore.</li>
        </ul>
        <Button onClick={() => setStarted(true)}>Entra in scena <LuArrowRight aria-hidden="true" /></Button>
      </section>
    );
  }

  if (result) {
    const pct = result.max ? result.score / result.max : 0;
    return (
      <section className="sim-end" ref={topRef}>
        <ArchProgress value={pct} size={88} label={`Risultato ${Math.round(pct * 100)}%`} />
        <span className="sim__kicker">Com’è andata</span>
        <h1 className="h-title">{result.ending?.title || 'Simulazione conclusa'}</h1>
        {result.ending?.text && <p className="lede">{result.ending.text}</p>}
        <p className="lcard__score">
          <span className="pill">{result.score} punti su {result.max}</span>
          {sending ? <span className="pill">Salvo…</span> : result.xp > 0 && <span className="pill pill--xp"><LuZap aria-hidden="true" /> +{result.xp} XP</span>}
        </p>
        <ol className="sim-recap">
          {steps.map((st, k) => {
            const n = s.nodes[st.node];
            const c = n.choices[st.choice];
            const best = Math.max(...n.choices.map((x) => x.score || 0));
            const r = rating(c.score || 0, best);
            return (
              <li key={k} className={r.cls}>
                <span className="sim-recap__n">{k + 1}</span>
                <div>
                  <strong>{c.label}</strong>
                  <span className="sim-rating">{r.icon} {r.label}</span>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="lesson-actions">
          <Button variant="secondary" block onClick={restart}><LuRotateCcw aria-hidden="true" /> Rigioca con altre scelte</Button>
          <ButtonLink to={`/corso/${slug}`} block>Torna al corso</ButtonLink>
        </div>
      </section>
    );
  }

  const choice = picked !== null ? current.choices[picked] : null;
  const best = Math.max(...current.choices.map((x) => x.score || 0));
  const r = choice ? rating(choice.score || 0, best) : null;
  return (
    <section className="sim-scene" ref={topRef}>
      <div className="sim-scene__head">
        <span className="sim__kicker">Decisione {decisions}</span>
        <span className="sim__role sim__role--chip">{s.role}</span>
      </div>
      <p key={node} className="sim-scene__text">{current.text}</p>
      <div className="sim-choices" role="radiogroup" aria-label="Che cosa fai?">
        {current.choices.map((c, i) => (
          <button
            key={i}
            role="radio"
            aria-checked={picked === i}
            disabled={picked !== null}
            className={`option ${picked === i ? 'is-on' : picked !== null ? 'is-dim' : ''}`}
            onClick={() => choose(i)}
          >
            <span className="option__key">{String.fromCharCode(65 + i)}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
      {choice && r && (
        <div className={`sim-feedback ${r.cls}`} role="status">
          <span className="sim-rating">{r.icon} {r.label}</span>
          <p>{choice.feedback}</p>
          <Button onClick={proceed} loading={sending}>
            {choice.next && s.nodes[choice.next] ? 'Continua' : 'Scopri com’è andata'} <LuArrowRight aria-hidden="true" />
          </Button>
        </div>
      )}
    </section>
  );
}
