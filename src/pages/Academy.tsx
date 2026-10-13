import React, { useMemo, useState } from 'react';
import { listCourses, listProgress, completedIn, lessonCount, courseMinutes, LEVEL_LABEL } from '../lib/data';
import { DoorCover, Empty, ErrorState, Screen, Spinner, TopBar, useAsync } from '../components/ui';
import { Link } from '../lib/router';
import { LuSearch } from 'react-icons/lu';
import { TeacherLine } from '../components/founder';

const LEVELS = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'base', label: 'Base' },
  { id: 'intermedio', label: 'Intermedio' },
  { id: 'avanzato', label: 'Avanzato' },
];

export default function Academy() {
  const data = useAsync(async () => {
    const [courses, progress] = await Promise.all([listCourses(), listProgress()]);
    return { courses, progress };
  }, []);
  const [q, setQ] = useState('');
  const [level, setLevel] = useState('tutti');

  const filtered = useMemo(() => {
    if (!data.data) return [];
    const term = q.trim().toLowerCase();
    return data.data.courses.filter(
      (c) =>
        (level === 'tutti' || c.level === level) &&
        (!term || [c.title, c.subtitle, c.description].some((t) => (t || '').toLowerCase().includes(term))),
    );
  }, [data.data, q, level]);

  return (
    <Screen>
      <TopBar />
      <main className="page">
        <h1 className="h-page">Academy</h1>
        <p className="muted">Ogni corso è una porta: entri, segui le lezioni, verifichi con un quiz.</p>
        <TeacherLine label="founder e docente di tutti i corsi" />

        <label className="search">
          <LuSearch aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca un corso" aria-label="Cerca un corso" />
        </label>
        <div className="chips" role="group" aria-label="Filtra per livello">
          {LEVELS.map((l) => (
            <button key={l.id} className={`chip chip--btn ${level === l.id ? 'is-on' : ''}`} onClick={() => setLevel(l.id)} aria-pressed={level === l.id}>
              {l.label}
            </button>
          ))}
        </div>

        {data.loading && <Spinner />}
        {data.error && <ErrorState message={data.error} onRetry={data.reload} />}

        {data.data && filtered.length === 0 && (
          <Empty title="Nessun corso trovato" text="Prova con un'altra parola o un altro livello." />
        )}

        <ul className="course-list">
          {filtered.map((c) => {
            const total = lessonCount(c);
            const done = data.data ? completedIn(c, data.data.progress) : 0;
            return (
              <li key={c.id}>
                <Link to={`/corso/${c.slug}`} className="course-row">
                  <DoorCover title={c.title} small />
                  <div className="course-row__body">
                    <span className="course-row__level">{LEVEL_LABEL[c.level]}{c.access_level === 'premium' ? ', Premium' : ''}</span>
                    <strong className="course-row__title">{c.title}</strong>
                    {c.subtitle && <span className="course-row__sub">{c.subtitle}</span>}
                    <span className="course-row__meta">
                      {total} lezioni, circa {courseMinutes(c)} min
                    </span>
                    {total > 0 && (
                      <span className="bar" aria-label={`${done} di ${total} lezioni completate`}>
                        <span style={{ width: `${(done / total) * 100}%` }} />
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </Screen>
  );
}
