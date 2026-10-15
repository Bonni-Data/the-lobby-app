import React, { useMemo, useState } from 'react';
import { Check } from '../lib/game';
import { LuCheck, LuX, LuRotateCcw, LuSparkles } from 'react-icons/lu';

export type CheckState = { value: number | boolean | number[]; correct: boolean };

/** Shuffle that is stable for a given check and never returns the right order. */
function shuffled(n: number, seed: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  let s = seed || 1;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (a.every((v, i) => v === i)) a.push(a.shift()!);
  return a;
}

function seedOf(text: string) {
  let h = 7;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 100000;
  return h;
}

export function checkKicker(c: Check) {
  return c.type === 'truefalse' ? 'Vero o falso?' : c.type === 'order' ? 'Metti in ordine' : 'Mettiti alla prova';
}

/** What the voice reads for a check. */
export function checkSpeech(c: Check) {
  if (c.type === 'truefalse') return `Vero o falso? ${c.statement}`;
  if (c.type === 'order') return `${c.prompt} ${c.items.map((t) => t.replace(/[.;]$/, '')).join('; ')}.`;
  return `${c.prompt} ${c.options.map((o, i) => `Risposta ${String.fromCharCode(65 + i)}: ${o.replace(/[.;]$/, '')}`).join('. ')}.`;
}

export function feedbackSpeech(c: Check, s: CheckState) {
  return `${s.correct ? 'Esatto.' : 'Non proprio.'} ${c.why || ''}`;
}

/** One interactive check: choose, true/false, or put in order. Answers lock after the first try. */
export function CheckCard({ check, state, onAnswer }: { check: Check; state?: CheckState; onAnswer: (s: CheckState) => void }) {
  const done = !!state;
  return (
    <div className={`ask ${done ? (state!.correct ? 'is-right' : 'is-wrong') : ''}`}>
      <span className="ask__kicker"><LuSparkles aria-hidden="true" /> {checkKicker(check)}</span>
      {check.type === 'choice' && <Choice check={check} state={state} onAnswer={onAnswer} />}
      {check.type === 'truefalse' && <TrueFalse check={check} state={state} onAnswer={onAnswer} />}
      {check.type === 'order' && <Order check={check} state={state} onAnswer={onAnswer} />}
      {done && (
        <div className="ask__why" role="status">
          <strong>{state!.correct ? <><LuCheck aria-hidden="true" /> Esatto.</> : <><LuX aria-hidden="true" /> Non proprio.</>}</strong>
          {check.why && <p>{check.why}</p>}
        </div>
      )}
    </div>
  );
}

function Choice({ check, state, onAnswer }: { check: Extract<Check, { type: 'choice' }>; state?: CheckState; onAnswer: (s: CheckState) => void }) {
  return (
    <>
      <h2 className="ask__prompt">{check.prompt}</h2>
      <div className="ask__options" role="radiogroup" aria-label={check.prompt}>
        {check.options.map((o, i) => {
          const chosen = state?.value === i;
          const right = state && i === check.correct;
          return (
            <button
              key={i}
              role="radio"
              aria-checked={chosen}
              disabled={!!state}
              className={`option ${chosen ? 'is-on' : ''} ${state ? (right ? 'is-right' : chosen ? 'is-wrong' : 'is-dim') : ''}`}
              onClick={() => onAnswer({ value: i, correct: i === check.correct })}
            >
              <span className="option__key">{right ? <LuCheck /> : chosen ? <LuX /> : String.fromCharCode(65 + i)}</span>
              <span>{o}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function TrueFalse({ check, state, onAnswer }: { check: Extract<Check, { type: 'truefalse' }>; state?: CheckState; onAnswer: (s: CheckState) => void }) {
  return (
    <>
      <h2 className="ask__prompt ask__prompt--statement">«{check.statement}»</h2>
      <div className="tf" role="radiogroup" aria-label="Vero o falso">
        {[true, false].map((v) => {
          const chosen = state?.value === v;
          const right = state && v === check.answer;
          return (
            <button
              key={String(v)}
              role="radio"
              aria-checked={chosen}
              disabled={!!state}
              className={`tf__btn ${chosen ? 'is-on' : ''} ${state ? (right ? 'is-right' : chosen ? 'is-wrong' : 'is-dim') : ''}`}
              onClick={() => onAnswer({ value: v, correct: v === check.answer })}
            >
              {v ? 'Vero' : 'Falso'}
            </button>
          );
        })}
      </div>
    </>
  );
}

function Order({ check, state, onAnswer }: { check: Extract<Check, { type: 'order' }>; state?: CheckState; onAnswer: (s: CheckState) => void }) {
  const order = useMemo(() => shuffled(check.items.length, seedOf(check.prompt + check.items.join('|'))), [check]);
  const [picks, setPicks] = useState<number[]>([]);
  const final = (state?.value as number[] | undefined) || picks;

  function pick(i: number) {
    if (state || picks.includes(i)) return;
    const next = [...picks, i];
    setPicks(next);
    if (next.length === check.items.length) onAnswer({ value: next, correct: next.every((v, k) => v === k) });
  }

  return (
    <>
      <h2 className="ask__prompt">{check.prompt}</h2>
      <p className="ask__hint">{state ? 'La tua sequenza:' : 'Tocca le voci nell’ordine giusto, dalla prima all’ultima.'}</p>
      <ol className="order__picked" aria-label="La tua sequenza">
        {final.map((i, k) => (
          <li key={i} className={state ? (i === k ? 'is-right' : 'is-wrong') : ''}>
            <span className="order__n">{k + 1}</span>{check.items[i]}
          </li>
        ))}
        {!state && Array.from({ length: check.items.length - final.length }).map((_, k) => (
          <li key={`e${k}`} className="is-empty" aria-hidden="true"><span className="order__n">{final.length + k + 1}</span></li>
        ))}
      </ol>
      {!state && (
        <div className="order__pool">
          {order.filter((i) => !picks.includes(i)).map((i) => (
            <button key={i} className="order__item" onClick={() => pick(i)}>{check.items[i]}</button>
          ))}
          {picks.length > 0 && (
            <button className="link-quiet order__reset" onClick={() => setPicks([])}><LuRotateCcw aria-hidden="true" /> Ricomincia</button>
          )}
        </div>
      )}
      {state && !state.correct && (
        <div className="order__solution">
          <span>L’ordine giusto:</span>
          <ol>{check.items.map((t, k) => <li key={k}>{t}</li>)}</ol>
        </div>
      )}
    </>
  );
}
