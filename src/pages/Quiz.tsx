import React, { useState } from 'react';
import { getQuiz, submitQuiz, QuizResult } from '../lib/data';
import { ArchProgress, Button, ButtonLink, Empty, ErrorState, Screen, Spinner, TopBar, useAsync } from '../components/ui';
import { LuCheck, LuX } from 'react-icons/lu';

export default function Quiz({ id }: { id: string }) {
  const data = useAsync(() => getQuiz(id), [id]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const quiz = data.data;
  const back = quiz ? `/lezione/${quiz.lesson_id}` : '/academy';

  async function send() {
    if (!quiz) return;
    setBusy(true);
    setError('');
    try {
      setResult(await submitQuiz(quiz.id, answers));
    } catch {
      setError('Invio non riuscito. Controlla la connessione e riprova.');
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setAnswers({});
    setResult(null);
    setStep(0);
  }

  return (
    <Screen nav={false}>
      <TopBar back={back} title={quiz?.title} />
      <main className="page">
        {data.loading && <Spinner />}
        {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
        {data.data === null && <Empty title="Quiz non disponibile" />}

        {quiz && !result && quiz.quiz_questions.length > 0 && (() => {
          const q = quiz.quiz_questions[step];
          const total = quiz.quiz_questions.length;
          const chosen = answers[q.id];
          const last = step === total - 1;
          return (
            <section className="quiz">
              <div className="quiz__steps" aria-label={`Domanda ${step + 1} di ${total}`}>
                {quiz.quiz_questions.map((qq, i) => (
                  <span key={qq.id} className={i < step ? 'is-past' : i === step ? 'is-now' : ''} />
                ))}
              </div>
              <p className="quiz__count">Domanda {step + 1} di {total}</p>
              <h1 className="quiz__prompt">{q.prompt}</h1>
              <div className="quiz__options" role="radiogroup">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    role="radio"
                    aria-checked={chosen === i}
                    className={`option ${chosen === i ? 'is-on' : ''}`}
                    onClick={() => setAnswers({ ...answers, [q.id]: i })}
                  >
                    <span className="option__key">{String.fromCharCode(65 + i)}</span>
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
              {error && <div className="alert" role="alert">{error}</div>}
              <div className="quiz__nav">
                {step > 0 && (
                  <Button variant="ghost" onClick={() => setStep(step - 1)}>Indietro</Button>
                )}
                {last ? (
                  <Button onClick={send} loading={busy} disabled={Object.keys(answers).length < total}>
                    Invia le risposte
                  </Button>
                ) : (
                  <Button onClick={() => setStep(step + 1)} disabled={chosen === undefined}>
                    Avanti
                  </Button>
                )}
              </div>
            </section>
          );
        })()}

        {quiz && result && (
          <section className="quiz-result">
            <ArchProgress value={result.max_score ? result.score / result.max_score : 0} size={84} />
            <h1 className="h-title">
              {result.score === result.max_score ? 'Tutto giusto.' : `${result.score} ${result.score === 1 ? 'risposta giusta' : 'risposte giuste'} su ${result.max_score}.`}
            </h1>
            <ul className="review">
              {quiz.quiz_questions.map((q, i) => {
                const d = result.details?.find((x) => x.question_id === q.id);
                const ok = d && d.chosen === d.correct_option;
                return (
                  <li key={q.id} className={ok ? 'ok' : 'ko'}>
                    <span className="review__icon">{ok ? <LuCheck /> : <LuX />}</span>
                    <div>
                      <p className="review__q">{i + 1}. {q.prompt}</p>
                      {!ok && d?.correct_option != null && (
                        <p className="review__a">Risposta corretta: {q.options[d.correct_option]}</p>
                      )}
                      {d?.explanation && <p className="review__why">{d.explanation}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="lesson-actions">
              <ButtonLink to={back} block>Torna alla lezione</ButtonLink>
              <Button variant="ghost" block onClick={restart}>Rifai il quiz</Button>
            </div>
          </section>
        )}
      </main>
    </Screen>
  );
}
